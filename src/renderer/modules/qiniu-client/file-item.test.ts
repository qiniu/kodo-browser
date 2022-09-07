import { Path as QiniuPath } from "qiniu-path/dist/src/path";
import {FileItem} from "@renderer/modules/qiniu-client/index";

import { FileExtensionType, getFileType } from './file-item';

describe("test file-utils.ts", () => {
  function getMockDataOfQiniuPath(name: string, ext?: string) {
    const nameWithExt = `${name}${ext ? "." + ext : ""}`
    return new QiniuPath(
      "/",
      "/",
      `/kodo-browser/services/file-utils.ts/${nameWithExt}`,
      `.${ext}`,
      ["kodo-browser", "services", "file-utils.ts", nameWithExt],
      false,
    )
  }
  describe("test getFileType", () => {
    it("folder", () => {
      const actual = getFileType({
        bucket: "test-file-getFileType",
        name: "folder",
        path: getMockDataOfQiniuPath("folder"),
        itemType: FileItem.ItemType.Directory,
      });
      expect(actual).toEqual({
        type: FileExtensionType.Folder,
        ext: [],
      });
    });
    it("ext picture", () => {
      const exts = [
        "png",
        "jpg",
        "jpeg",
        "bmp",
        "gif",
      ];
      for (const ext of exts) {
        const actual = getFileType({
          bucket: "test-file-getFileType",
          name: `picture.${ext}`,
          path: getMockDataOfQiniuPath("picture", ext),
          itemType: FileItem.ItemType.File,
          size: 1 << 10,
          storageClass: "Normal",
          lastModified: new Date("2021-11-24T03:50:25.855Z"),
          withinFourHours: false,
        });
        expect(actual).toEqual({
          type: FileExtensionType.Picture,
          ext: [ext],
        });
      }
    });
    it('ext document', () => {
      const exts = [
        "doc",
        "docx",
        "pdf",
      ];
      for (const ext of exts) {
        const actual = getFileType({
          bucket: "test-file-getFileType",
          name: `picture.${ext}`,
          path: getMockDataOfQiniuPath("picture", ext),
          itemType: FileItem.ItemType.File,
          size: 1 << 10,
          storageClass: "Normal",
          lastModified: new Date("2021-11-24T03:50:25.855Z"),
          withinFourHours: false,
        });
        expect(actual).toEqual({
          type: FileExtensionType.Document,
          ext: [ext],
        });
      }
    });
    it('ext video', () => {
      const exts = [
        "mp4",
        "webm",
        "mov",
        "ogv",
        "flv",
      ];
      for (const ext of exts) {
        const actual = getFileType({
          bucket: "test-file-getFileType",
          name: `picture.${ext}`,
          path: getMockDataOfQiniuPath("picture", ext),
          itemType: FileItem.ItemType.File,
          size: 1 << 10,
          storageClass: "Normal",
          lastModified: new Date("2021-11-24T03:50:25.855Z"),
          withinFourHours: false,
        });
        const expectMimeTypeMapper: { [id: string]: string } = {
          mov: "video/quicktime",
          ogv: "video/ogg",
          flv: "video/x-flv",
        };
        expect(actual).toEqual({
          type: FileExtensionType.Video,
          mimeType: expectMimeTypeMapper[ext] ?? `video/${ext}`,
          ext: [ext],
        });
      }

    });
    it('ext audio', () => {
      const exts = [
        "mp3",
        "ogg",
      ];
      for (const ext of exts) {
        const actual = getFileType({
          bucket: "test-file-getFileType",
          name: `picture.${ext}`,
          path: getMockDataOfQiniuPath("picture", ext),
          itemType: FileItem.ItemType.File,
          size: 1 << 10,
          storageClass: "Normal",
          lastModified: new Date("2021-11-24T03:50:25.855Z"),
          withinFourHours: false,
        });
        expect(actual).toEqual({
          type: FileExtensionType.Audio,
          mimeType: `audio/${ext}`,
          ext: [ext],
        });
      }

    });
    it('ext other', () => {
      const exts = [
        "other"
      ];
      for (const ext of exts) {
        const actual = getFileType({
          bucket: "test-file-getFileType",
          name: `picture.${ext}`,
          path: getMockDataOfQiniuPath("picture", ext),
          itemType: FileItem.ItemType.File,
          size: 1 << 10,
          storageClass: "Normal",
          lastModified: new Date("2021-11-24T03:50:25.855Z"),
          withinFourHours: false,
        });
        expect(actual).toEqual({
          type: FileExtensionType.Others,
          ext: [ext],
        });
      }
    });
  });
});
