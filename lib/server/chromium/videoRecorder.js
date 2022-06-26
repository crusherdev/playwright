"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VideoRecorder = void 0;

var _stream = require("stream");

var _fs = _interopRequireDefault(require("fs"));

var _utils = require("../../utils/utils");

var _page = require("../page");

var _progress = require("../progress");

var _instrumentation = require("../instrumentation");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const fps = 25;

class VideoRecorder {
  static async launch(page, ffmpegPath, options) {
    if (!options.outputFile.endsWith('.webm')) throw new Error('File must have .webm extension');
    const controller = new _progress.ProgressController((0, _instrumentation.internalCallMetadata)(), page);
    controller.setLogName('browser');
    return await controller.run(async progress => {
      const recorder = new VideoRecorder(page, ffmpegPath, progress);
      await recorder._launch(options);
      return recorder;
    });
  }

  constructor(page, ffmpegPath, progress) {
    this._process = null;
    this._gracefullyClose = null;
    this._lastWritePromise = Promise.resolve();
    this._lastFrameTimestamp = 0;
    this._lastFrameBuffer = null;
    this._lastWriteTimestamp = 0;
    this._progress = void 0;
    this._frameQueue = [];
    this._isStopped = false;
    this._ffmpegPath = void 0;
    this._stream = new _stream.PassThrough();
    this._progress = progress;
    this._ffmpegPath = ffmpegPath;
    page.on(_page.Page.Events.ScreencastFrame, frame => this.writeFrame(frame.buffer, frame.timestamp));
  }

  async _launch(options) {
    // How to tune the codec:
    // 1. Read vp8 documentation to figure out the options.
    //   https://www.webmproject.org/docs/encoder-parameters/
    // 2. Use the following command to map the options to ffmpeg arguments.
    //   $ ./third_party/ffmpeg/ffmpeg-mac -h encoder=vp8
    // 3. A bit more about passing vp8 options to ffmpeg.
    //   https://trac.ffmpeg.org/wiki/Encode/VP8
    //
    // We use the following vp8 options:
    //   "-qmin 0 -qmax 50" - quality variation from 0 to 50.
    //     Suggested here: https://trac.ffmpeg.org/wiki/Encode/VP8
    //   "-crf 8" - constant quality mode, 4-63, lower means better quality.
    //   "-deadline realtime" - do not use too much cpu to keep up with incoming frames.
    //   "-b:v 1M" - video bitrate. Default value is too low for vp8
    //     Suggested here: https://trac.ffmpeg.org/wiki/Encode/VP8
    //
    // We use "pad" and "crop" video filters (-vf option) to resize incoming frames
    // that might be of the different size to the desired video size.
    //   https://ffmpeg.org/ffmpeg-filters.html#pad-1
    //   https://ffmpeg.org/ffmpeg-filters.html#crop
    //
    // We use "image2pipe" mode to pipe frames and get a single video.
    // "-f image2pipe -c:v mjpeg -i -" forces input to be read from standard input, and forces
    // mjpeg input image format.
    //   https://trac.ffmpeg.org/wiki/Slideshow
    //
    // "-y" means overwrite output.
    // "-an" means no audio.
    const w = options.width;
    const h = options.height;
    const progress = this._progress;

    const writeStream = _fs.default.createWriteStream(options.outputFile);

    this._stream.pipe(writeStream);

    this._stream.on('error', e => {
      progress.log(`video error`); // do not reject as a result of not having frames

      if (!this._lastFrameBuffer && e.message.includes('pipe:0: End of file')) {
        return;
      }

      progress.log(`pw-video: error capturing video: ${e.message}`);
    });
  }

  writeFrame(frame, timestamp) {
    if (this._isStopped) return;

    this._progress.log(`writing frame ` + timestamp);

    if (this._lastFrameBuffer) {
      const durationSec = timestamp - this._lastFrameTimestamp;
      const repeatCount = Math.max(1, Math.round(fps * durationSec));

      for (let i = 0; i < repeatCount; ++i) this._frameQueue.push(this._lastFrameBuffer);

      this._lastWritePromise = this._lastWritePromise.then(() => this._sendFrames());
    }

    this._lastFrameBuffer = frame;
    this._lastFrameTimestamp = timestamp;
    this._lastWriteTimestamp = (0, _utils.monotonicTime)();
  }

  async _sendFrames() {
    while (this._frameQueue.length) await this._sendFrame(this._frameQueue.shift());
  }

  async _sendFrame(frame) {
    return this._stream.write(frame);
  }

  async stop() {
    if (this._isStopped) return;
    this.writeFrame(Buffer.from([]), this._lastFrameTimestamp + ((0, _utils.monotonicTime)() - this._lastWriteTimestamp) / 1000);
    this._isStopped = true;
    await this._lastWritePromise;
    await this._stream.end();
  }

}

exports.VideoRecorder = VideoRecorder;