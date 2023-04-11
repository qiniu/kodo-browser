export interface StackFrame {
  funcName: string,
  fileLink: string,
}

export default function (s: string = ""): StackFrame[] {
  const result: StackFrame[] = [];
  s.split("\n")
    .forEach((stackStr, i) => {
      if (i < 2) {
        return;
      }
      const stackRawList = stackStr.trim().split(" ");
      let funcName = "";
      let fileLink = "";
      if (stackRawList.length >= 3) {
        [, funcName, fileLink] = stackRawList;
        fileLink = fileLink.slice(1, -1);
      } else if (stackRawList.length >= 2) {
        [, fileLink] = stackRawList;
      }
      result.push({
        funcName: funcName,
        fileLink: fileLink,
      });
    });
  return result;
}
