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
var my = require("myclass"), bridjs = require("bridjs"),
        Signature = bridjs.Signature, x265, Nal, Picture, ClipCsp, Stats, Param,
        Rc, X265Exception = require("./x265_exception"), r=255, g=0, b=0, y, u, v;

Nal = bridjs.defineStruct(
        {
            type: bridjs.structField(Signature.uint, 0), //uint32_t type;        /* NalUnitType */
            sizeBytes: bridjs.structField(Signature.uint, 1), //uint32_t sizeBytes;   /* size in bytes */
            payload: bridjs.structField(Signature.pointer, 2)//uint8_t* payload;
        });

Picture = bridjs.defineStruct(
        {
            planes: bridjs.structArrayField(Signature.pointer, 3, 0), //void*   planes[3];
            stride: bridjs.structArrayField(Signature.int, 3, 1), //int     stride[3];
            bitDepth: bridjs.structField(Signature.int, 2), //int     bitDepth;
            sliceType: bridjs.structField(Signature.int, 3), //int     sliceType;
            poc: bridjs.structField(Signature.int, 4), //int     poc;
            colorSpace: bridjs.structField(Signature.int, 5), //int     colorSpace;
            pts: bridjs.structField(Signature.int64, 6), //int64_t pts;
            dts: bridjs.structField(Signature.int64, 7), //int64_t dts;
            userData: bridjs.structField(Signature.pointer, 8)//void*   userData;

                    /* new data members to this structure must be added to the end so that
                     * users of x265_picture_alloc/free() can be assured of future safety */
        });

ClipCsp = bridjs.defineStruct(
        {
            planes: bridjs.structField(Signature.int, 0), //int planes;
            width: bridjs.structArrayField(Signature.int, 3, 1), // int width[3];
            height: bridjs.structArrayField(Signature.int, 3, 2)//,int height[3];
        });

/* Output statistics from encoder */
Stats = bridjs.defineStruct(
        {
            globalPsnrY: bridjs.structField(Signature.double, 0), //double    globalPsnrY;
            globalPsnrU: bridjs.structField(Signature.double, 1), //double    globalPsnrU;
            globalPsnrV: bridjs.structField(Signature.double, 2), //double    globalPsnrV;
            globalPsnr: bridjs.structField(Signature.double, 3), //double    globalPsnr;
            globalSsim: bridjs.structField(Signature.double, 4), //double    globalSsim;
            elapsedEncodeTime: bridjs.structField(Signature.double, 5), //double    elapsedEncodeTime;    /* wall time since encoder was opened */
            elapsedVideoTime: bridjs.structField(Signature.double, 6), // double    elapsedVideoTime;     /* encoded picture count / frame rate */
            bitrate: bridjs.structField(Signature.double, 7), //double    bitrate;              /* accBits / elapsed video time */
            encodePictureCount: bridjs.structField(Signature.uint32, 8), //uint32_t  encodedPictureCount;  /* number of output pictures thus far */
            totalFrames: bridjs.structField(Signature.uint32, 9), //uint32_t  totalWPFrames;        /* number of uni-directional weighted frames used */
            accBits: bridjs.structField(Signature.uint64, 10)//uint64_t  accBits;              /* total bits output thus far */

                    /* new statistic member variables must be added below this line */
        });

Rc = bridjs.defineStruct(
        {
            /* Explicit mode of rate-control, necessary for API users. It must
             * be one of the X265_RC_METHODS enum values. */
            rateControlMode: bridjs.structField(Signature.int, 0), //int       rateControlMode;

            /* Base QP to use for Constant QP rate control. Adaptive QP may alter
             * the QP used for each block. If a QP is specified on the command line
             * CQP rate control is implied. Default: 32 */
            qp: bridjs.structField(Signature.int, 1), //int       qp;

            /* target bitrate for Average BitRate (ABR) rate control. If a non- zero
             * bitrate is specified on the command line, ABR is implied. Default 0 */
            bitrate: bridjs.structField(Signature.int, 2), //int       bitrate;

            /* The degree of rate fluctuation that x265 tolerates. Rate tolerance is used 
             * alongwith overflow (difference between actual and target bitrate), to adjust
             qp. Default is 1.0 */
            rateTolerance: bridjs.structField(Signature.double, 3), //double    rateTolerance;

            /* qComp sets the quantizer curve compression factor. It weights the frame 
             * quantizer based on the complexity of residual (measured by lookahead). 
             * Default value is 0.6. Increasing it to 1 will effectively generate CQP */
            qCompress: bridjs.structField(Signature.double, 4), //double    qCompress;

            /* QP offset between I/P and P/B frames. Default ipfactor: 1.4
             *  Default pbFactor: 1.3 */
            ipFactor: bridjs.structField(Signature.double, 5), //double    ipFactor;
            pbFactor: bridjs.structField(Signature.double, 6), //double    pbFactor;

            /* Max QP difference between frames. Default: 4 */
            qpStep: bridjs.structField(Signature.int, 7), //int       qpStep;

            /* Ratefactor constant: targets a certain constant "quality". 
             * Acceptable values between 0 and 51. Default value: 28 */
            rfConstant: bridjs.structField(Signature.double, 8), //double    rfConstant;                  

            /* Enable adaptive quantization. This mode distributes available bits between all 
             * macroblocks of a frame, assigning more bits to low complexity areas. Turning 
             * this ON will usually affect PSNR negatively, however SSIM and visual quality
             * generally improves. Default: OFF (0) */
            aqMode: bridjs.structField(Signature.int, 9), //int       aqMode;

            /* Sets the strength of AQ bias towards low detail macroblocks. Valid only if
             * AQ is enabled. Default value: 1.0. Acceptable values between 0.0 and 3.0 */
            aqStregth: bridjs.structField(Signature.double, 10), //double    aqStrength;

            /* Sets the maximum rate the VBV buffer should be assumed to refill at 
             * Default is zero */
            vbvMaxBitrate: bridjs.structField(Signature.int, 11), //int       vbvMaxBitrate;

            /* Sets the size of the VBV buffer in kilobits. Default is zero */
            vbvBufferSize: bridjs.structField(Signature.int, 12), //int       vbvBufferSize;

            /* Sets how full the VBV buffer must be before playback starts. If it is less than 
             * 1, then the initial fill is vbv-init * vbvBufferSize. Otherwise, it is 
             * interpreted as the initial fill in kbits. Default is 0.9 */
            vbvBufferInit: bridjs.structField(Signature.double, 13), //double    vbvBufferInit;

            /* Enable CUTree ratecontrol. This keeps track of the CUs that propagate temporally 
             * across frames and assigns more bits to these CUs. Improves encode efficiency.
             * Default: OFF (0) */
            cuTree: bridjs.structField(Signature.int, 14)//int       cuTree;
        });
/* x265 input parameters
 *
 * For version safety you may use x265_param_alloc/free() to manage the
 * allocation of x265_param instances, and x265_param_parse() to assign values
 * by name.  By never dereferencing param fields in your own code you can treat
 * x265_param as an opaque data structure */
Param = bridjs.defineStruct(
        {
            /*== Encoder Environment ==*/

            /* Enable wavefront parallel processing, greatly increases parallelism for
             * less than 1% compression efficiency loss */
            bEnableWavefront: bridjs.structField(Signature.int, 0), //int       bEnableWavefront;

            /* Number of threads to allocate for the process global thread pool, if no
             * thread pool has yet been created. 0 implies auto-detection. By default
             * x265 will try to allocate one worker thread per CPU core */
            poolNumThreads: bridjs.structField(Signature.int, 1), //int       poolNumThreads;

            /* Number of concurrently encoded frames, 0 implies auto-detection. By
             * default x265 will use a number of frame threads emperically determined to
             * be optimal for your CPU core count, between 2 and 6.  Using more than one
             * frame thread causes motion search in the down direction to be clamped but
             * otherwise encode behavior is unaffected. With CQP rate control the output
             * bitstream is deterministic for all values of frameNumThreads greater than
             * 1.  All other forms of rate-control can be negatively impacted by
             * increases to the number of frame threads because the extra concurrency
             * adds uncertainty to the bitrate estimations.  There is no limit to the
             * number of frame threads you use for each encoder, but frame parallelism
             * is generally limited by the the number of CU rows */
            frameNumThreads: bridjs.structField(Signature.int, 2), //int       frameNumThreads;

            /* The level of logging detail emitted by the encoder. X265_LOG_NONE to
             * X265_LOG_DEBUG, default is X265_LOG_INFO */
            logLevel: bridjs.structField(Signature.int, 3), //int       logLevel;

            /* Enable the measurement and reporting of PSNR. Default is enabled */
            bEnablePsnr: bridjs.structField(Signature.int, 4), //int       bEnablePsnr;

            /* Enable the measurement and reporting of SSIM. Default is disabled */
            bEnableSsim: bridjs.structField(Signature.int, 5), //int       bEnableSsim;

            /* filename of CSV log. If logLevel is X265_LOG_DEBUG, the encoder will emit
             * per-slice statistics to this log file in encode order. Otherwise the
             * encoder will emit per-stream statistics into the log file when
             * x265_encoder_log is called (presumably at the end of the encode) */
            csvfn: bridjs.structField(Signature.pointer, 6), //const char *csvfn;

            /* Enable the generation of SEI messages for each encoded frame containing
             * the hashes of the three reconstructed picture planes. Most decoders will
             * validate those hashes against the reconstructed images it generates and
             * report any mismatches. This is essentially a debugging feature.  Hash
             * types are MD5(1), CRC(2), Checksum(3).  Default is 0, none */
            decodedPictureHashSEI: bridjs.structField(Signature.int, 7), //int       decodedPictureHashSEI;

            /*== Source Picture Specification ==*/

            /* source pixel bit depth (and internal encoder bit depth). If x265 was
             * compiled to use 8bit pixels (HIGH_BIT_DEPTH=0), this field must be 8 and
             * x265_picture.bitDepth must also be 8. x265_max_bit_depth can be consulted
             * at runtime to determine the maximum bit depth supported by your build of
             * x265. A high bit depth build of x265 will support input bit depths of 8,
             * 10, or 12 */
            inputBitDepth: bridjs.structField(Signature.int, 8), //int       inputBitDepth;

            /* Color space of internal pictures. Only X265_CSP_I420 is currently supported.
             * Eventually, i422 and i444 will be supported as internal color spaces and other
             * packed formats will be supported in x265_picture.colorSpace */
            internalCsp: bridjs.structField(Signature.int, 9), //int       internalCsp;

            /* Frame rate of source pictures */
            frameRate: bridjs.structField(Signature.int, 10), //int       frameRate;

            /* Width (in pixels) of the source pictures. If this width is not an even
             * multiple of 4, the encoder will pad the pictures internally to meet this
             * minimum requirement. All valid HEVC widths are supported */
            sourceWidth: bridjs.structField(Signature.int, 11), //int       sourceWidth;

            /* Height (in pixels) of the source pictures. If this height is not an even
             * multiple of 4, the encoder will pad the pictures internally to meet this
             * minimum requirement. All valid HEVC heights are supported */
            sourceHeight: bridjs.structField(Signature.int, 12), //int       sourceHeight;

            /*== Coding Unit (CU) definitions ==*/

            /* Maxiumum CU width and height in pixels.  The size must be 64, 32, or 16.
             * The higher the size, the more efficiently x265 can encode areas of low
             * complexity, greatly improving compression efficiency at large
             * resolutions.  The smaller the size, the more effective wavefront and
             * frame parallelism will become because of the increase in rows. default 64 */
            maxCUSize: bridjs.structField(Signature.uint32, 13), //uint32_t  maxCUSize;

            /* The additional depth the residual quadtree is allowed to recurse beyond
             * the coding quadtree, for inter coded blocks. This must be between 1 and
             * 3. The higher the value the more efficiently the residual can be
             * compressed by the DCT transforms, at the expense of much more compute */
            tuQTMaxInterDepth: bridjs.structField(Signature.uint32, 14), //uint32_t  tuQTMaxInterDepth;

            /* The additional depth the residual quadtree is allowed to recurse beyond
             * the coding quadtree, for intra coded blocks. This must be between 1 and
             * 3. The higher the value the more efficiently the residual can be
             * compressed by the DCT transforms, at the expense of much more compute */
            tuQTMaxIntraDepth: bridjs.structField(Signature.uint32, 15), //uint32_t  tuQTMaxIntraDepth;

            /*== GOP Structure and Lokoahead ==*/

            /* Enable open GOP - meaning I slices are not necessariy IDR and thus frames
             * encoded after an I slice may reference frames encoded prior to the I
             * frame which have remained in the decoded picture buffer.  Open GOP
             * generally has better compression efficiency and negligable encoder
             * performance impact, but the use case may preclude it.  Default true */
            bOpenGOP: bridjs.structField(Signature.int, 16), //int       bOpenGOP;

            /* Minimum keyframe distance or intra period in number of frames. Can be
             * between 1 and keyframeMax. When the lookahead is between the min and max
             * thresholds, it will use an I slice if a scene cut is detected, or a
             * P slice otherwise */
            keyframeMin: bridjs.structField(Signature.int, 17), //int       keyframeMin;

            /* Maximum keyframe distance or intra period in number of frames. If 0 or
             * 1, all frames are I frames. -1 is casted to MAX_UINT internally which
             * effectively makes frame 0 the only I frame. Default is 250 */
            keyframeMax: bridjs.structField(Signature.int, 18), //int       keyframeMax;

            /* The maximum number of L0 references a P or B slice may use. This
             * influences the size of the decoded picture buffer. The higher this
             * number, the more reference frames there will be available for motion
             * search, improving compression efficiency of most video at a cost of
             * performance. Value must be between 1 and 16, default is 3 */
            maxNumReference: bridjs.structField(Signature.int, 19), //int       maxNumReferences;

            /* Sets the operating mode of the lookahead.  With b-adapt 0, the GOP
             * structure is fixed based on the values of keyframeMax and bframes.
             * With b-adapt 1 a light lookahead is used to chose B frame placement.
             * With b-adapt 2 (trellis) a viterbi B path selection is performed */
            bFrameAdaptive: bridjs.structField(Signature.int, 20), //int       bFrameAdaptive;

            /* Maximum consecutive B frames that can be emitted by the lookehead. When
             * b-adapt is 0 and keyframMax is greater than bframes, the lookahead emits
             * a fixed pattern of `bframes` B frames between each P.  With b-adapt 1 the
             * lookahead ignores the value of bframes for the most part.  With b-adapt 2
             * the value of bframes determines the search (POC) distance performeed in
             * both directions, quadradically increasing the compute load of the
             * lookahead.  The higher the value, the more B frames the lookahead may
             * possibly use consecutively, usually improving compression. Default is 3,
             * maximum is 16 */
            bframe: bridjs.structField(Signature.int, 21), //int       bframes;

            /* When enabled, the encoder will use the B frame in the middle of each
             * mini-GOP larger than 2 B frames as a motion reference for the surrounding
             * B frames.  This improves compression efficiency for a small performance
             * penalty.  Referenced B frames are treated somewhere between a B and a P
             * frame by rate control.  Default is enabled. */
            bBPyramid: bridjs.structField(Signature.int, 22), //int       bBPyramid;

            /* The number of frames that must be queued in the lookahead before it may
             * make slice decisions. Increasing this value directly increases the encode
             * latency. The longer the queue the more optimally the lookahead may make
             * slice decisions, particularly with b-adapt 2. When mb-tree is enabled,
             * the length of the queue linearly increases the effectiveness of the
             * mb-tree analysis. Default is 40 frames, maximum is 250 */
            lookaheadDepth: bridjs.structField(Signature.int, 23), //int       lookaheadDepth;

            /* A value which is added to the cost estimate of B frames in the lookahead.
             * It may be a positive value (making B frames appear more expensive, which
             * causes the lookahead to chose more P frames) or negative, which makes the
             * lookahead chose more B frames. Default is 0, there are no limits */
            bFrameBias: bridjs.structField(Signature.int, 24), //int       bFrameBias;

            /* An arbitrary threshold which determines how agressively the lookahead
             * should detect scene cuts. The default (40) is recommended. */
            scenecutThreshold: bridjs.structField(Signature.int, 25), //int       scenecutThreshold;

            /*== Intra Coding Tools ==*/

            /* Enable constrained intra prediction. This causes intra prediction to
             * input samples that were inter predicted. For some use cases this is
             * believed to me more robust to stream errors, but it has a compression
             * penalty on P and (particularly) B slices. Defaults to diabled */
            bEnableConstrainedIntra: bridjs.structField(Signature.int, 26), //int       bEnableConstrainedIntra;

            /* Enable strong intra smoothing for 32x32 blocks where the reference
             * samples are flat. It may or may not improve compression efficiency,
             * depending on your source material. Defaults to disabled */
            bEnableStrongIntraSmoothing: bridjs.structField(Signature.int, 27), //int       bEnableStrongIntraSmoothing;

            /*== Inter Coding Tools ==*/

            /* ME search method (DIA, HEX, UMH, STAR, FULL). The search patterns
             * (methods) are sorted in increasing complexity, with diamond being the
             * simplest and fastest and full being the slowest.  DIA, HEX, and UMH were
             * adapted from x264 directly. STAR is an adaption of the HEVC reference
             * encoder's three step search, while full is a naive exhaustive search. The
             * default is the star search, it has a good balance of performance and
             * compression efficiecy */
            searchMethod: bridjs.structField(Signature.int, 28), //int       searchMethod;

            /* A value between 0 and X265_MAX_SUBPEL_LEVEL which adjusts the amount of
             * effort performed during subpel refine. Default is 5 */
            subpelRefine: bridjs.structField(Signature.int, 29), //int       subpelRefine;

            /* The maximum distance from the motion prediction that the full pel motion
             * search is allowed to progress before terminating. This value can have an
             * effect on frame parallelism, as referenced frames must be at least this
             * many rows of reconstructed pixels ahead of the referencee at all times.
             * (When considering reference lag, the motion prediction must be ignored
             * because it cannot be known ahead of time).  Default is 60, which is the
             * default max CU size (64) minus the luma HPEL half-filter length (4). If a
             * smaller CU size is used, the search range should be similarly reduced */
            searchRange: bridjs.structField(Signature.int, 30), //int       searchRange;

            /* The maximum number of merge candidates that are considered during inter
             * analysis.  This number (between 1 and 5) is signaled in the stream
             * headers and determines the number of bits required to signal a merge so
             * it can have significant trade-offs. The smaller this number the higher
             * the performance but the less compression efficiency. Default is 3 */
            maxNumMergeCand: bridjs.structField(Signature.uint32, 31), //uint32_t  maxNumMergeCand;

            /* Enable weighted prediction in P slices.  This enables weighting analysis
             * in the lookahead, which influences slice decitions, and enables weighting
             * analysis in the main encoder which allows P reference samples to have a
             * weight function applied to them prior to using them for motion
             * compensation.  In video which has lighting changes, it can give a large
             * improvement in compression efficiency. Default is enabled */
            bEnableWeightedPred: bridjs.structField(Signature.int, 32), //int       bEnableWeightedPred;

            /* Enable weighted bi-prediction in B slices. This option currently has no
             * effect */
            bEnableWeightedBiPred: bridjs.structField(Signature.int, 33), //int       bEnableWeightedBiPred;

            /*== Analysis tools ==*/

            /* Enable asymmetrical motion predictions.  At CU depths 64, 32, and 16, it
             * is possible to use 25%/75% split partitions in the up, down, right, left
             * directions. For some material this can improve compression efficiency at
             * the cost of extra analysis. bEnableRectInter must be enabled for this
             * feature to be used. Default enabled */
            bEnableAMP: bridjs.structField(Signature.int, 34), //int       bEnableAMP;

            /* Enable rectangular motion prediction partitions (vertical and
             * horizontal), available at all CU depths from 64x64 to 8x8. Default is
             * enabled */
            bEnableRectInter: bridjs.structField(Signature.int, 35), //int       bEnableRectInter;

            /* Enable the use of `coded block flags` (flags set to true when a residual
             * has been coded for a given block) to avoid intra analysis in likely skip
             * blocks. Default is disabled */
            bEnableCbfFastMod: bridjs.structField(Signature.int, 36), //int       bEnableCbfFastMode;

            /* Enable early skip decisions to avoid intra and inter analysis in likely
             * skip blocks. Default is disabled */
            bEnableEarlySkip: bridjs.structField(Signature.int, 37), //int       bEnableEarlySkip;

            /* Apply an optional penalty to the estimated cost of 32x32 intra blocks in
             * non-intra slices. 0 is disabled, 1 enables a small penalty, and 2 enables
             * a full penalty. This favors inter-coding and its low bitrate over
             * potential increases in distortion, but usually improves performance.
             * Default is 0 */
            rdPenalty: bridjs.structField(Signature.int, 38), //int       rdPenalty;

            /* A value betwen X265_NO_RDO_NO_RDOQ and X265_RDO_LEVEL which determines
             * the level of rate distortion optimizations to perform during mode
             * decisions and quantization. The more RDO the better the compression
             * efficiency at a major cost of performance. Default is no RDO (0) */
            rdLevel: bridjs.structField(Signature.int, 39), //int       rdLevel;

            /*== Coding tools ==*/

            /* Enable the implicit signaling of the sign bit of the last coefficient of
             * each transform unit. This saves one bit per TU at the expense of figuring
             * out which coefficient can be toggled with the least distortion.
             * Default is enabled */
            bEnableSignHiding: bridjs.structField(Signature.int, 40), //int       bEnableSignHiding;

            /* Allow intra coded blocks to be encoded directly as residual without the
             * DCT transform, when this improves efficiency. Checking whether the block
             * will benefit from this option incurs a performance penalty. Default is
             * enabled */
            bEnableTransformSkip: bridjs.structField(Signature.int, 41), //int       bEnableTransformSkip;

            /* Enable a faster determination of whether skippig the DCT transform will
             * be beneficial. Slight performance gain for some compression loss. Default
             * is enabled */
            bEnableTSkipFast: bridjs.structField(Signature.int, 42), //int       bEnableTSkipFast;

            /* Enable the deblocking loop filter, which improves visual quality by
             * reducing blocking effects at block edges, particularly at lower bitrates
             * or higher QP. When enabled it adds another CU row of reference lag,
             * reducing frame parallelism effectiveness.  Default is enabled */
            bEnableLoopFilter: bridjs.structField(Signature.int, 43), //int       bEnableLoopFilter;

            /* Enable the Sample Adaptive Offset loop filter, which reduces distortion
             * effects by adjusting reconstructed sample values based on histogram
             * analysis to better approximate the original samples. When enabled it adds
             * a CU row of reference lag, reducing frame parallelism effectiveness.
             * Default is enabled */
            bEnableSAO: bridjs.structField(Signature.int, 44), //int       bEnableSAO;

            /* Note: when deblocking and SAO are both enabled, the loop filter CU lag is
             * only one row, as they operate in series o the same row. */

            /* Select the method in which SAO deals with deblocking boundary pixels.  If
             * 0 the right and bottom boundary areas are skipped. If 1, non-deblocked
             * pixels are used entirely. Default is 0 */
            saoLcuBoundary: bridjs.structField(Signature.int, 45), //int       saoLcuBoundary;

            /* Select the scope of the SAO optimization. If 0 SAO is performed over the
             * entire output picture at once, this can severly restrict frame
             * parallelism so it is not recommended for many-core machines.  If 1 SAO is
             * performed on LCUs in series. Default is 1 */
            saoLcuBasedOptimization: bridjs.structField(Signature.int, 46), //int       saoLcuBasedOptimization;

            /* Generally a small signed integer which offsets the QP used to quantize
             * the Cb chroma residual (delta from luma QP specified by rate-control).
             * Default is 0, which is recommended */
            cbQpOffset: bridjs.structField(Signature.int, 47), //int       cbQpOffset;

            /* Generally a small signed integer which offsets the QP used to quantize
             * the Cr chroma residual (delta from luma QP specified by rate-control).
             * Default is 0, which is recommended */
            crQpOffset: bridjs.structField(Signature.int, 48), //int       crQpOffset;

            /*== Rate Control ==*/

            rc: bridjs.structField(Rc, 49)
        });// x265_param;


x265 = bridjs.defineModule({
    Nal: Nal,
    Picture: Picture,
    NANO_TO_SECONDS: 1.0 / (1000 * 1000 * 1000),
    NAL_UNIT_CODED_SLICE_TRAIL_N: 0,
    NAL_UNIT_CODED_SLICE_TRAIL_R: 1,
    NAL_UNIT_CODED_SLICE_TSA_N: 2,
    NAL_UNIT_CODED_SLICE_TLA_R: 3,
    NAL_UNIT_CODED_SLICE_STSA_N: 4,
    NAL_UNIT_CODED_SLICE_STSA_R: 5,
    NAL_UNIT_CODED_SLICE_RADL_N: 6,
    NAL_UNIT_CODED_SLICE_RADL_R: 7,
    NAL_UNIT_CODED_SLICE_RASL_N: 8,
    NAL_UNIT_CODED_SLICE_RASL_R: 9,
    NAL_UNIT_CODED_SLICE_BLA_W_LP: 16,
    NAL_UNIT_CODED_SLICE_BLA_W_RADL: 17,
    NAL_UNIT_CODED_SLICE_BLA_N_LP: 18,
    NAL_UNIT_CODED_SLICE_IDR_W_RADL: 19,
    NAL_UNIT_CODED_SLICE_IDR_N_LP: 20,
    NAL_UNIT_CODED_SLICE_CRA: 21,
    NAL_UNIT_VPS: 32,
    NAL_UNIT_SPS: 33,
    NAL_UNIT_PPS: 34,
    NAL_UNIT_ACCESS_UNIT_DELIMITER: 35,
    NAL_UNIT_EOS: 36,
    NAL_UNIT_EOB: 37,
    NAL_UNIT_FILLER_DATA: 38,
    NAL_UNIT_PREFIX_SEI: 39,
    NAL_UNIT_SUFFIX_SEI: 40,
    NAL_UNIT_INVALID: 64,
    DIA_SEARCH: 0,
    HEX_SEARCH: 1,
    UMH_SEARCH: 2,
    STAR_SEARCH: 3,
    FULL_SEARCH: 4,
    /* CPU flags */
    /* x86 */
    CPU_CMOV: 0x0000001,
    CPU_MMX: 0x0000002,
    CPU_MMX2: 0x0000004, /* MMX2 aka MMXEXT aka ISSE */
    CPU_MMXEXT: 0x0000004,
    CPU_SSE: 0x0000008,
    CPU_SSE2: 0x0000010,
    CPU_SSE3L: 0x0000020,
    CPU_SSSE3: 0x0000040,
    CPU_SSE4: 0x0000080, /* SSE4.1 */
    CPU_SSE42: 0x0000100, /* SSE4.2 */
    CPU_LZCNT: 0x0000200, /* Phenom support for "leading zero count" instruction. */
    CPU_AVX: 0x0000400, /* AVX support: requires OS support even if YMM registers aren't used. */
    CPU_XOP: 0x0000800, /* AMD XOP */
    CPU_FMA4: 0x0001000, /* AMD FMA4 */
    CPU_AVX2: 0x0002000, /* AVX2 */
    CPU_FMA3: 0x0004000, /* Intel FMA3 */
    CPU_BMI1: 0x0008000, /* BMI1 */
    CPU_BMI2: 0x0010000, /* BMI2 */
    /* x86 modifiers */
    CPU_CACHELINE_32: 0x0020000, /* avoid memory loads that span the border between two cachelines */
    CPU_CACHELINE_64: 0x0040000, /* 32/64 is the size of a cacheline in bytes */
    CPU_SSE2_IS_SLOW: 0x0080000, /* avoid most SSE2 functions on Athlon64 */
    CPU_SSE2_IS_FAST: 0x0100000, /* a few functions are only faster on Core2 and Phenom */
    CPU_SLOW_SHUFFLE: 0x0200000, /* The Conroe has a slow shuffle unit (relative to overall SSE performance) */
    CPU_STACK_MOD4: 0x0400000, /* if stack is only mod4 and not mod16 */
    CPU_SLOW_CTZ: 0x0800000, /* BSR/BSF x86 instructions are really slow on some CPUs */
    CPU_SLOW_ATOM: 0x1000000, /* The Atom is terrible: slow SSE unaligned loads, slow
     * SIMD multiplies, slow SIMD variable shifts, slow pshufb,
     * cacheline split penalties -- gather everything here that
     * isn't shared by other CPUs to avoid making half a dozen
     * new SLOW flags. */
    CPU_SLOW_PSHUFB: 0x2000000, /* such as on the Intel Atom */
    CPU_SLOW_PALIGNR: 0x4000000, /* such as on the AMD Bobcat */

    MAX_SUBPEL_LEVEL: 7,
    /* Log level */
    LOG_NONE: (-1),
    LOG_ERROR: 0,
    LOG_WARNING: 1,
    LOG_INFO: 2,
    LOG_DEBUG: 3,
    B_ADAPT_NONE: 0,
    B_ADAPT_FAST: 1,
    B_ADAPT_TRELLIS: 2,
    TYPE_AUTO: 0x0000, /* Let x265 choose the right type */
    TYPE_IDR: 0x0001,
    TYPE_I: 0x0002,
    TYPE_P: 0x0003,
    TYPE_BREF: 0x0004, /* Non-disposable B-frame */
    TYPE_B: 0x0005,
    TYPE_KEYFRAME: 0x0006, /* IDR or I depending on b_open_gop option */
    AQ_NONE: 0,
    AQ_VARIANCE: 1,
    AQ_AUTO_VARIANCE: 2,
    isX265TypeI: function(x) {
        return    ((x) === this.TYPE_I || (x) === this.TYPE_IDR);
    },
    isX265TypeB: function(x) {
        ((x) === this.TYPE_B || (x) === this.TYPE_BREF);
    },
    /* NOTE! For this release only X265_CSP_I420 is supported */

    /* Supported internal color space types (according to semantics of chroma_format_idc) */
    CSP_I400: 0, /* yuv 4:0:0 planar */
    CSP_I420: 1, /* yuv 4:2:0 planar */
    CSP_I422: 2, /* yuv 4:2:2 planar */
    CSP_I444: 3, /* yuv 4:4:4 planar */
    CSP_COUNT: 4, /* Number of supported internal color spaces */

    /* These color spaces will eventually be supported as input pictures. The pictures will
     * be converted to the appropriate planar color spaces at ingest */
    CSP_NV12: 4, /* yuv 4:2:0, with one y plane and one packed u+v */
    CSP_NV16: 5, /* yuv 4:2:2, with one y plane and one packed u+v */

    /* Interleaved color-spaces may eventually be supported as input pictures */
    CSP_BGR: 6, /* packed bgr 24bits   */
    CSP_BGRA: 7, /* packed bgr 32bits   */
    CSP_RGB: 8, /* packed rgb 24bits   */
    CSP_MAX: 9, /* end of list */

    RC_ABR: 0,
    RC_CQP: 1,
    RC_CRF: 2,
    /***
     * If not called, first encoder allocated will auto-detect the CPU and
     * initialize performance primitives, which are process global */
    setupPrimitives: bridjs.defineFunction(Signature.void, bridjs.byPointer(Param), Signature.int).bind("x265_setup_primitives"), //void x265_setup_primitives(x265_param *param, int cpu);

    /***
     * Convert ssim into db
     */
//ssim:bridjs.defineFunction(Signature.double, Signature.double).bind("x265_ssim"),//,double x265_ssim(double ssim);

    //buildInfoStr: bridjs.defineFunction(Signature.string).bind("x265_build_info_str"), //x265_build_info_str

    /***
     * Release library static allocations
     */
    cleanup: bridjs.defineFunction(Signature.void).bind("x265_cleanup"), //void x265_cleanup(void),

    /* x265_param_alloc:
     *  Allocates an x265_param instance. The returned param structure is not
     *  special in any way, but using this method together with x265_param_free()
     *  and x265_param_parse() to set values by name allows the application to treat
     *  x265_param as an opaque data struct for version safety */
    paramAlloc: bridjs.defineFunction(bridjs.byPointer(Param)).bind("x265_param_alloc"), //x265_param *x265_param_alloc();

    /* x265_param_free:
     *  Use x265_param_free() to release storage for an x265_param instance
     *  allocated by x26_param_alloc() */
    paramFree: bridjs.defineFunction(Signature.void, bridjs.byPointer(Param)).bind("x265_param_free"), //void x265_param_free(x265_param *);

    /***
     * Initialize an x265_param_t structure to default values
     */
    paramDefault: bridjs.defineFunction(Signature.void, bridjs.byPointer(Param)).bind("x265_param_default"), //void x265_param_default(x265_param *param);

    /* x265_param_parse:
     *  set one parameter by name.
     *  returns 0 on success, or returns one of the following errors.
     *  note: BAD_VALUE occurs only if it can't even parse the value,
     *  numerical range is not checked until x265_encoder_open() or
     *  x265_encoder_reconfig().
     *  value=NULL means "true" for boolean options, but is a BAD_VALUE for non-booleans. */
    PARAM_BAD_NAME: (-1),
    PARAM_BAD_VALUE: (-2),
    paramParse: bridjs.defineFunction(Signature.void, bridjs.byPointer(Param), Signature.string, Signature.string).bind("x265_param_parse"), //int x265_param_parse(x265_param *p, const char *name, const char *value);

    PROFILE_NAME_MAIN: "main",
    PROFILE_NAME_MAIN10: "main10",
    PROFILE_NAME_MAINSTILLPICTURE: "mainstillpicture",
    /*      (can be NULL, in which case the function will do nothing)
     *      returns 0 on success, negative on failure (e.g. invalid profile name). */
    paramApplyProfile: bridjs.defineFunction(Signature.int, bridjs.byPointer(Param), Signature.string).bind("x265_param_apply_profile"), //int x265_param_apply_profile(x265_param *, const char *profile);
    /* x265_param_default_preset:
     *      The same as x265_param_default, but also use the passed preset and tune
     *      to modify the default settings.
     *      (either can be NULL, which implies no preset or no tune, respectively)
     *
     *      Currently available presets are, ordered from fastest to slowest: */
//static const char * const x265_preset_names[] = { "ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo", 0 };

    PRESET_NAME_ULTRAFAST: "ultrafast",
    PRESET_NAME_SUPERFAST: "superfast",
    PRESET_NAME_VERYFAST: "veryfast",
    PRESET_NAME_FASTER: "faster",
    PRESET_NAME_FAST: "fast",
    PRESET_NAME_MEDIUM: "medium",
    PRESET_NAME_SLOW: "slow",
    PRESET_NAME_SLOWER: "slower",
    PRESET_NAME_VERYSLOW: "veryslow",
    PRESET_NAME_PLACEBO: "placebo",
    /*      The presets can also be indexed numerically, as in:
     *      x265_param_default_preset( &param, "3", ... )
     *      with ultrafast mapping to "0" and placebo mapping to "9".  This mapping may
     *      of course change if new presets are added in between, but will always be
     *      ordered from fastest to slowest.
     *
     *      Warning: the speed of these presets scales dramatically.  Ultrafast is a full
     *      100 times faster than placebo!
     *
     *      Currently available tunings are: */
//static const char * const x265_tune_names[] = { "psnr", "ssim", "zero-latency", 0 };
    TUNE_NAME_PSNR: "psnr",
    TUNE_NAME_SSIM: "ssim",
    TUNE_NAME_ZERO_LATENCY: "zero-latency",
    /*      returns 0 on success, negative on failure (e.g. invalid preset/tune name). */
    paramDefaultPreset: bridjs.defineFunction(Signature.int, bridjs.byPointer(Param), Signature.string, Signature.string).bind("x265_param_default_preset"), //int x265_param_default_preset(x265_param *, const char *preset, const char *tune);

    /* x265_picture_alloc:
     *  Allocates an x265_picture instance. The returned picture structure is not
     *  special in any way, but using this method together with x265_picture_free()
     *  and x265_picture_init() allows some version safety. New picture fields will
     *  always be added to the end of x265_picture */
    pictureAlloc: bridjs.defineFunction(bridjs.byPointer(Picture)).bind("x265_picture_alloc"), //x265_picture *x265_picture_alloc();

    /* x265_picture_free:
     *  Use x265_picture_free() to release storage for an x265_picture instance
     *  allocated by x26_picture_alloc() */
    pictureFree: bridjs.defineFunction(Signature.void, bridjs.byPointer(Picture)).bind("x265_picture_free"), //void x265_picture_free(x265_picture *);

    /***
     * Initialize an x265_picture structure to default values
     */
    pictureInit: bridjs.defineFunction(Signature.void, bridjs.byPointer(Param), bridjs.byPointer(Picture)).bind("x265_picture_init"), //void x265_picture_init(x265_param *param, x265_picture *pic);

    /* x265_encoder_open:
     *      create a new encoder handler, all parameters from x265_param_t are copied */
    encoderOpen: bridjs.defineFunction(Signature.pointer, bridjs.byPointer(Param)).bind("x265_encoder_open_5"),
    /* x265_encoder_headers:
     *      return the SPS and PPS that will be used for the whole stream.
     *      *pi_nal is the number of NAL units outputted in pp_nal.
     *      returns negative on error.
     *      the payloads of all output NALs are guaranteed to be sequential in memory. */
    encoderHeaders: bridjs.defineFunction(Signature.int, Signature.pointer, bridjs.byPointer(bridjs.NativeValue.pointer), bridjs.byPointer(bridjs.NativeValue.uint32)).bind("x265_encoder_headers"), //int x265_encoder_headers(x265_encoder *, x265_nal **pp_nal, uint32_t *pi_nal);

    /* x265_encoder_encode:
     *      encode one picture.
     *      *pi_nal is the number of NAL units outputted in pp_nal.
     *      returns negative on error, zero if no NAL units returned.
     *      the payloads of all output NALs are guaranteed to be sequential in memory. */
    encoderEncode: bridjs.defineFunction(Signature.int, Signature.pointer, bridjs.byPointer(bridjs.NativeValue.pointer),
            bridjs.byPointer(bridjs.NativeValue.uint32), bridjs.byPointer(Picture), bridjs.byPointer(Picture)).bind("x265_encoder_encode"), //int x265_encoder_encode(x265_encoder *encoder, x265_nal **pp_nal, uint32_t *pi_nal, x265_picture *pic_in, x265_picture *pic_out);

    /* x265_encoder_get_stats:
     *       returns encoder statistics */
    encoderGetStats: bridjs.defineFunction(Signature.void, Signature.pointer, bridjs.byPointer(Stats), Signature.uint32).bind("x265_encoder_get_stats"), //void x265_encoder_get_stats(x265_encoder *encoder, x265_stats *, uint32_t statsSizeBytes);

    /* x265_encoder_log:
     *       write a line to the configured CSV file.  If a CSV filename was not
     *       configured, or file open failed, or the log level indicated frame level
     *       logging, this function will perform no write. */
    encoderLog: bridjs.defineFunction(Signature.void, Signature.pointer, Signature.int, bridjs.byPointer(bridjs.NativeValue.pointer)).bind("x265_encoder_log"), //void x265_encoder_log(x265_encoder *encoder, int argc, char **argv);
    /* x265_encoder_close:
     *      close an encoder handler */
    encoderClose: bridjs.defineFunction(Signature.void, Signature.pointer).bind("x265_encoder_close"), //void x265_encoder_close(x265_encoder *),
    NativeValue: bridjs.NativeValue,
    utils: bridjs.utils,
    byPointer: function(obj) {
        return bridjs.byPointer(obj);
    },
    sizeof: function(klass) {
        return bridjs.getTypeSize(klass);
    },
    async:function(){
      return bridjs.async(this);  
    },
    checkError: function(error) {
        if (error !== 0) {
            throw new X265Exception("Error: " + error);
        }
    },
    timeSeconds: function() {
        var time = process.hrtime();

        return time[0] + (time[1] * this.NANO_TO_SECONDS);
    },
    
    clamp:function(value ,min, max){
        if(value<min){
            value = min;
        }
        
        if(value>max){
            value = max;
        }
        
        return value;
    },
    
    rgbToYuv:function(rgb){
        var yuv = new Array(3), r = rgb[0], g = rgb[1], b = rgb[2];
        
        yuv[0] = this.clamp(Math.round(0.299*r+0.587*g+0.114*b),0,255);
        yuv[1] = this.clamp(Math.round(-0.169*r-0.331*g+0.5*b+128),0,255);
        yuv[2] = this.clamp(Math.round(0.5*r-0.419*g-0.081*b+128),0,255);
        
        return yuv;
    }
}, "x265");


module.exports = new x265();