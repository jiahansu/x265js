/*
 * x265js - An implementation of the JavaScript bindings for x265.
 * https://github.com/jiahansu/x265js
 *
 * Copyright (c) 2013-2013, Jia-Han Su (https://github.com/jiahansu) stat
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Olivier Chafik nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY JIA-HAN SU AND CONTRIBUTORS ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE REGENTS AND CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


var log4js = require("log4js"), bridjs = require("bridjs"),
        log = log4js.getLogger("example"), x265, param, error = 0, pEncoder,
        pNal = new bridjs.NativeValue.pointer(), nal,
        numNal = new bridjs.NativeValue.uint32(), fs = require('fs'),
        releaseX265Func, fd/*, buffer = new Buffer(16384)*/, nalIndex, writeNexNal,
        closeFile, writeBytes, writeNal, picIn, picOut, /* yBuffer, uBuffer,
         vBuffer,*/ i, outFrameCount = 0, r = 255, g = 255, b = 255, yuv,
        totalFrames = 30, pendingBuffers = new Array(), popFreeBuffer,
        defaultBufferSize = 16384, writeBuffers = new Array(),
        notifyWriteBufferUpdate, streamClosed = false, notifyToCloseStream,
        readyToCloseStream = false, bufferInWriting = false;

log.info(bridjs.symbols("x265d"));

x265 = require("../lib/x265");
picIn = x265.pictureAlloc();
picOut = x265.pictureAlloc();

popFreeBuffer = function(size) {
    var buffer = null;

    if (pendingBuffers.length > 0) {
        buffer = pendingBuffers.shift();
        if (buffer instanceof Buffer && buffer.length < size) {
            log.warn("Drop buffer due to its capacity is not enough: " + buffer.length);
            buffer = null;
        }
    }

    if (buffer === null) {
        buffer = new Buffer(Math.max(size, defaultBufferSize));
        log.debug("Create a new free buffer: " + buffer.length);
    }

    return buffer;
};

pushFreeBuffer = function(buffer) {

    if (pendingBuffers.length < 3) {
        pendingBuffers.push(buffer);
    } else {
        log.debug("pendingBuffers is full, drop buffer: " + buffer.length);
    }

    return pendingBuffers.length;
};

popWriteBuffer = function() {
    var buffer = null;

    if (writeBuffers.length > 0) {
        buffer = writeBuffers.shift();
    }

    return buffer;
};

pushWriteBuffer = function(buffer) {
    writeBuffers.push(buffer);
};

releaseX265Func = function() {
    log.info("Release x265 resources");

    log.info("Release picIn: " + x265.byPointer(picIn).toString());
    x265.pictureFree(x265.byPointer(picIn));
    log.info("Release picOut");
    x265.pictureFree(x265.byPointer(picOut));
    log.info("Close encoder: " + pEncoder);
    x265.encoderClose(pEncoder);

    x265.paramFree(x265.byPointer(param));

    param = null;
    //log.info(x265.paramAlloc());
    x265.cleanup();
    log.info("YUV: " + yuv);
    console.log("Done");
};

param = x265.paramAlloc();

log.info("param's size = " + x265.sizeof(param));
//log.info(x265.PRESET_NAME_ULTRAFAST + ", " + x265.TUNE_NAME_SSIM);
x265.paramDefault(x265.byPointer(param));
x265.setupPrimitives(x265.byPointer(param), -1);
error = x265.paramDefaultPreset(x265.byPointer(param), x265.PRESET_NAME_ULTRAFAST, x265.TUNE_NAME_SSIM);

x265.checkError(error);
param.internalCsp = x265.CSP_I420;
param.sourceWidth = 1920;
param.sourceHeight = 1080;
param.frameRate = 30;
param.inputBitDeth = 8;
/*yBuffer, uBuffer & vBuffer is global object*/
yBuffer = new Buffer(param.sourceWidth * param.sourceHeight * (param.inputBitDeth / 8));
uBuffer = new Buffer(param.sourceWidth * param.sourceHeight * (param.inputBitDeth / 8) / 4);
vBuffer = new Buffer(param.sourceWidth * param.sourceHeight * (param.inputBitDeth / 8) / 4);

yuv = x265.rgbToYuv([r, g, b]);

yBuffer.fill(yuv[0]);
uBuffer.fill(yuv[1]);
vBuffer.fill(yuv[2]);
/*
 log.info("Release picIn: "+x265.byPointer(picIn).toString());
 x265.pictureFree(x265.byPointer(picIn));
 log.info("Release picOut");
 x265.pictureFree(x265.byPointer(picOut));
 log.info("done");
 x265.checkError(-1);   
 */
x265.pictureInit(x265.byPointer(param), x265.byPointer(picIn));
x265.pictureInit(x265.byPointer(param), x265.byPointer(picOut));

picIn.bitDepth = param.inputBitDeth;
picIn.planes.set(0, yBuffer);
picIn.planes.set(1, uBuffer);
picIn.planes.set(2, vBuffer);

picIn.stride.set(0, param.sourceWidth);
picIn.stride.set(1, picIn.stride.get(0) / 2);
picIn.stride.set(2, picIn.stride.get(1));
//log.info(picIn.bitDepth);

log.info("param.poolNumThreads: " + param.poolNumThreads);
pEncoder = x265.encoderOpen(x265.byPointer(param));

error = x265.encoderHeaders(pEncoder, x265.byPointer(pNal), x265.byPointer(numNal));
x265.checkError(error);

nal = new x265.Nal(pNal.get());

log.info("Number of Nal: " + numNal.get());

closeFile = function() {
    log.info("Close file: " + fd);
    streamClosed = true;
    fs.close(fd, function() {
        releaseX265Func();
    });
};
flushEncoder = function() {
    var pointer, numEncoded;

    console.log("flushEncoder");

    numEncoded = x265.encoderEncode(pEncoder, x265.byPointer(pNal), x265.byPointer(numNal), null, x265.byPointer(picOut));
    outFrameCount += numEncoded;

    log.info("numEncoded: " + numEncoded);

    x265.checkError(error);
    pointer = pNal.get();
    if (pointer !== null) {
        writeNal(fd, pNal, numNal.get(), function(error) {
            if (error) {
                log.warn("Fail to write header: " + error);
                closeFile();
            } else {
                if (numEncoded > 0) {
                    flushEncoder();
                } else {
                    notifyToCloseStream();
                }
            }
        });
    } else {
        log.debug("No encode data for writting");
        notifyToCloseStream();
        //closeFile();
    }
};
encodeFrames = function(frames) {
    var pointer, seconds,
            color = (totalFrames - frames) / totalFrames * 255, encodeFrameCallback;
    log.info("encodeFrames: " + frames);

    yuv = x265.rgbToYuv([color, color, color]);

    yBuffer.fill(yuv[0]);
    uBuffer.fill(yuv[1]);
    vBuffer.fill(yuv[2]);

    seconds = x265.timeSeconds();
    
    encodeFrameCallback = function(numEncoded) {
        log.debug("Spend " + (x265.timeSeconds() - seconds) + " to encode one frame");

        outFrameCount += numEncoded;
        x265.checkError(error);
        log.info("numEncoded: " + numEncoded);
        pointer = pNal.get();
        if (pointer !== null) {
            writeNal(fd, pNal, numNal.get(), function(error) {
                if (error) {
                    log.warn("Fail to write header: " + error);
                    notifyToCloseStream();
                } else {
                    --frames;

                    if (frames >= 0) {
                        encodeFrames(frames);
                    } else {
                        flushEncoder();
                    }
                }
            });
        } else {
            log.debug("No encode data for writting");
            notifyToCloseStream();
        }
    };
    //log.info("Start to encode frame");
    x265.async().encoderEncode(pEncoder, x265.byPointer(pNal),
            x265.byPointer(numNal), x265.byPointer(picIn), x265.byPointer(picOut), encodeFrameCallback);
    //log.info("End to encode frame");

    
    
    //encodeFrameCallback(numEncoded);
};
notifyToCloseStream = function() {
    log.info("Notify to close stream");
    readyToCloseStream = true;
    notifyWriteBufferUpdate();
};
notifyWriteBufferUpdate = function() {
    if (!bufferInWriting) {
        var buffer = popWriteBuffer();
        log.info(writeBuffers.length + ", " + (buffer === null));
        if (buffer !== null && !streamClosed) {
            bufferInWriting = true;
            log.debug("Start to Write bytes, start = " + writeBytes + ", length = " + buffer.writeBytes);
            fs.write(fd, buffer, 0, buffer.writeBytes, writeBytes, function(err, written, buffer) {
                log.debug("End to Write bytes, start = " + writeBytes + ", length = " + buffer.writeBytes);
                bufferInWriting = false;
                pushFreeBuffer(buffer);
                writeBytes += written;
                if (err) {
                    if (!streamClosed) {
                        closeFile();
                    }
                } else {
                    if (writeBuffers.length <= 0 && readyToCloseStream && !streamClosed) {
                        closeFile();
                    } else {
                        notifyWriteBufferUpdate();
                    }

                }
            });
        } else if (readyToCloseStream && !streamClosed) {
            closeFile();
        } else {
            log.debug("notifyWriteBufferUpdate: no pending write buffers");
        }
    }
};
writeNextNal = function(fd, pNal, nalIndex, nalcount, callback) {
    var pointer = pNal.get().slice(x265.sizeof(x265.Nal) * nalIndex),
            buffer = popFreeBuffer(nal.sizeBytes);

    nal = new x265.Nal(pointer);

    log.debug("Nal index: " + nalIndex, "nal.type = " + nal.type + ", nal.sizeBytes = " + nal.sizeBytes + ", " + ", nal.payload" + nal.payload);

    x265.utils.memoryCopy(buffer, nal.payload, nal.sizeBytes);
    buffer.writeBytes = nal.sizeBytes;
    pushWriteBuffer(buffer);
    notifyWriteBufferUpdate();
    ++nalIndex;
    if (nalIndex < nalcount) {
        writeNextNal(fd, pNal, nalIndex, nalcount, callback);
    } else {
        log.info("Write header is done: " + nalIndex);
        if (typeof (callback) === "function") {
            callback();
        } else {
            log.fatal("No callback function");
        }
    }
    //buffer.write("Test string!!", "utf-8");
    /*
     fs.write(fd, buffer, 0, nal.sizeBytes, writeBytes, function(err, written, buffer) {
     //log.info('bytes written: ' + written);
     pushFreeBuffer(buffer);
     writeBytes += written;
     if (err) {
     log.warn("Fail to write file: " + err);
     if (typeof (callback) === "function") {
     callback(err);
     } else {
     log.fatal("No callback function");
     }
     //closeFile();
     } else {
     ++nalIndex;
     if (nalIndex < nalcount) {
     writeNextNal(fd, pNal, nalIndex, nalcount, callback);
     } else {
     log.info("Write header is done: " + nalIndex);
     if (typeof (callback) === "function") {
     callback();
     } else {
     log.fatal("No callback function");
     }
     //encodeFrames();
     }
     }
     });*/
};
/*
 writeNextNal = function(fd, pNal, nalIndex, nalcount, callback) {
 var pointer = pNal.get().slice(x265.sizeof(x265.Nal) * nalIndex),
 buffer = popFreeBuffer(nal.sizeBytes);
 
 nal = new x265.Nal(pointer);
 
 log.debug("Nal index: " + nalIndex, "nal.type = " + nal.type + ", nal.sizeBytes = " + nal.sizeBytes + ", " + ", nal.payload" + nal.payload);
 
 x265.utils.memoryCopy(buffer, nal.payload, nal.sizeBytes);
 buffer.writeBytes = nal.sizeBytes;
 //buffer.write("Test string!!", "utf-8");
 fs.write(fd, buffer, 0, nal.sizeBytes, writeBytes, function(err, written, buffer) {
 //log.info('bytes written: ' + written);
 pushFreeBuffer(buffer);
 writeBytes += written;
 if (err) {
 log.warn("Fail to write file: " + err);
 if (typeof (callback) === "function") {
 callback(err);
 } else {
 log.fatal("No callback function");
 }
 //closeFile();
 } else {
 ++nalIndex;
 if (nalIndex < nalcount) {
 writeNextNal(fd, pNal, nalIndex, nalcount, callback);
 } else {
 log.info("Write header is done: " + nalIndex);
 if (typeof (callback) === "function") {
 callback();
 } else {
 log.fatal("No callback function");
 }
 //encodeFrames();
 }
 }
 });
 };*/

writeNal = function(fd, pNal, nalCount, callback) {
    writeNextNal(fd, pNal, 0, nalCount, callback);
};
fs.open("examples/output.x265", 'w', function(err, localFd) {
    fd = localFd;
    if (err) {
        log.warn("Fail to open file: " + err);
    } else {
        writeBytes = 0;
        writeNal(fd, pNal, numNal.get(), function(error) {
            if (error) {
                log.warn("Faile to write header: " + error);
                closeFile();
            } else {
                //notifyToCloseStream();
                encodeFrames(totalFrames);
            }
        });
    }
});







