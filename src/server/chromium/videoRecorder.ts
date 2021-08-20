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

import { ChildProcess } from 'child_process';
import { PassThrough } from 'stream';
import fs from 'fs';
import { monotonicTime } from '../../utils/utils';
import { Page } from '../page';
import { Progress, ProgressController } from '../progress';
import { internalCallMetadata } from '../instrumentation';
import * as types from '../types';

const fps = 25;

export class VideoRecorder {
  private _process: ChildProcess | null = null;
  private _gracefullyClose: (() => Promise<void>) | null = null;
  private _lastWritePromise: Promise<void> = Promise.resolve();
  private _lastFrameTimestamp: number = 0;
  private _lastFrameBuffer: Buffer | null = null;
  private _lastWriteTimestamp: number = 0;
  private readonly _progress: Progress;
  private _frameQueue: Buffer[] = [];
  private _isStopped = false;
  private _ffmpegPath: string;
  private _stream = new PassThrough();

  static async launch(page: Page, ffmpegPath: string, options: types.PageScreencastOptions): Promise<VideoRecorder> {
    if (!options.outputFile.endsWith('.webm'))
      throw new Error('File must have .webm extension');

    const controller = new ProgressController(internalCallMetadata(), page);
    controller.setLogName('browser');
    return await controller.run(async progress => {
      const recorder = new VideoRecorder(page, ffmpegPath, progress);
      await recorder._launch(options);
      return recorder;
    });
  }

  private constructor(page: Page, ffmpegPath: string, progress: Progress) {
    this._progress = progress;
    this._ffmpegPath = ffmpegPath;
    page.on(Page.Events.ScreencastFrame, frame => this.writeFrame(frame.buffer, frame.timestamp));
  }

  private async _launch(options: types.PageScreencastOptions) {
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

    const writeStream = fs.createWriteStream(options.outputFile);
    this._stream.pipe(writeStream);
    this._stream.on('error',  (e: Error) => {
      progress.log(`video error`);
      // do not reject as a result of not having frames
      if (
        !this._lastFrameBuffer &&
        e.message.includes('pipe:0: End of file')
      ) {
        return
      }
      progress.log(`pw-video: error capturing video: ${e.message}`);
    });
  }

  writeFrame(frame: Buffer, timestamp: number) {
    if (this._isStopped)
      return;
    this._progress.log(`writing frame ` + timestamp);

    if (this._lastFrameBuffer) {
      const durationSec = timestamp - this._lastFrameTimestamp;
      const repeatCount = Math.max(1, Math.round(fps * durationSec));
      for (let i = 0; i < repeatCount; ++i)
        this._frameQueue.push(this._lastFrameBuffer);
      this._lastWritePromise = this._lastWritePromise.then(() => this._sendFrames());
    }

    this._lastFrameBuffer = frame;
    this._lastFrameTimestamp = timestamp;
    this._lastWriteTimestamp = monotonicTime();
  }

  private async _sendFrames() {
    while (this._frameQueue.length)
      await this._sendFrame(this._frameQueue.shift()!);
  }

  private async _sendFrame(frame: Buffer) {
    return this._stream.write(frame);
  }

  async stop() {
    if (this._isStopped)
      return;
    this.writeFrame(Buffer.from([]), this._lastFrameTimestamp + (monotonicTime() - this._lastWriteTimestamp) / 1000);
    this._isStopped = true;
    await this._lastWritePromise;
    await this._stream.end();
  }
}
