import * as fs from "fs-extra";

import { App } from "../app";
import { Log } from "../log";
import { BuildUrlOptionsInterface } from "../interfaces/BuildUrlOptionsInterface";
import { QueueItemInterface } from "../interfaces/QueueItemInterface";

export class BuildService {
  constructor() {}
  /**
   *  Holds current processing item
   **/
  currentQueueItem: QueueItemInterface;
  async start() {
    setInterval(() => {
      if (!this.currentQueueItem) {
        this.initiateQueue()
          .then(() => {})
          .catch(async e => {
            const optionsPath =
              "./queue/" + this.currentQueueItem.uid + ".json";
            this.currentQueueItem.processingError = (e || "").toString();
            await fs.writeJSON(optionsPath, this.currentQueueItem);
            this.currentQueueItem = null;
            Log.error(e);
          });
      }
    }, 1000);
  }

  async initiateQueue() {
    const queueFiles = await fs.readdir("./queue");

    let optionsPath: any;
    let options: BuildUrlOptionsInterface;
    for (const file of queueFiles) {
      optionsPath = "./queue/" + file;
      options = await fs.readJson(optionsPath);
      if (
        !options.processingStarted ||
        (options.processingStarted &&
          !options.processingFinished &&
          !options.processingError &&
          Date.now() - options.processingStarted > 60000)
      ) {
        break;
      } else options = null;
    }

    if (options) {
      Log.info("found item to process", options);
      this.currentQueueItem = options;
      options.processingStarted = Date.now();
      await fs.writeJSON(optionsPath, options);

      if (fs.existsSync(options.directory)) {
        await fs.emptyDir(options.directory);
        await fs.rmdir(options.directory);
      }

      await App.services.scrape.run(options);
      await App.services.scrape.writeConfig(options);

      const pbService = App.services.phonegap;
      const pbApi = await pbService.authUser();
      await pbService.removePrevious(pbApi);

      await pbService.uploadApp(options, pbApi);

      const newApp = await pbService.currentApp(pbApi);

      await pbService.buildApp(newApp.id, pbApi);
      await pbService.downloadApp(options, newApp.id, pbApi);

      options.processingFinished = Date.now();
      await fs.writeJSON(optionsPath, options);
    }
  }
}
