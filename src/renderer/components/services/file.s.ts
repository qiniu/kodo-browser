import CodeMirror from '@/libCompatible/codemirror';
import * as FileItem from "@/models/file-item";

// const FILE_SVS_FACTORY = 'fileSvs'

export enum FileExtensionType {
  Folder = "folder",
  Picture = "picture",
  Document = "doc",
  Video = "video",
  Audio = "audio",
  Code = "code",
  Others = "others",
}

interface FileTypeInfo {
  type: FileExtensionType,
  ext: string[],
  mimeType?: string,
  mode?: string, // codemirror
}

export function getFileType(item: FileItem.Item): FileTypeInfo {
  if (item.itemType === 'folder') {
    return {
      type: FileExtensionType.Folder,
      ext: [],
    };
  }

  const ext = item.path.extname()?.substring(1) ?? '';

  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "bmp":
    case "gif":
      return {
        type: FileExtensionType.Picture,
        ext: [ext]
      };

    case "doc":
    case "docx":
    case "pdf":
    case "ppt":
    case "pptx":
    case "exl":
      return {
        type: FileExtensionType.Document,
        ext: [ext]
      };

    case "mp4":
      return {
        type: FileExtensionType.Video,
        ext: [ext],
        mimeType: "video/mp4"
      };
    case "webm":
      return {
        type: FileExtensionType.Video,
        ext: [ext],
        mimeType: "video/webm"
      };
    case "mov":
      return {
        type: FileExtensionType.Video,
        ext: [ext],
        mimeType: "video/quicktime"
      };
    case "ogv":
      return {
        type: FileExtensionType.Video,
        ext: [ext],
        mimeType: "video/ogg"
      };
    case "flv":
      return {
        type: FileExtensionType.Video,
        ext: [ext],
        mimeType: "video/x-flv"
      };

    case "mp3":
      return {
        type: FileExtensionType.Audio,
        ext: [ext],
        mimeType: "audio/mp3"
      };
    case "ogg":
      return {
        type: FileExtensionType.Audio,
        ext: [ext],
        mimeType: "audio/ogg"
      };
  }

  const codeMode = CodeMirror.findModeByExtension(ext);
  if (codeMode) {
    return {
      type: FileExtensionType.Code,
      ext: codeMode.ext ?? [],
      mimeType: codeMode.mime,
      mode: codeMode.mode,
    };
  }

  return {
    type: FileExtensionType.Others,
    ext: [ext]
  };
}
