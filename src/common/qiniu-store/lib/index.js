import UploadJob from './upload-job'
import DownloadJob from './download-job'

/**
 * QiniuStore
 */

class QiniuStore {
  createUploadJob(options) {
    return new UploadJob(options);
  }

  createDownloadJob(options) {
    return new DownloadJob(options);
  }
}

export default QiniuStore;
