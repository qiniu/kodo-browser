import { Path as QiniuPath } from "qiniu-path/dist/src/path";
import * as qiniuPathConvertor from "qiniu-path/dist/src/convert";

export function getMockDataOfQiniuPath(name: string, ext?: string) {
    const isDir = name.endsWith("/");
    const fullName = isDir ? `${name}${ext ? "." + ext : ""}` : name;
    return new QiniuPath(
        "/",
        "",
        undefined,
        !isDir ? `.${ext}` : undefined,
        ["qiniu-client", isDir ? fullName.slice(0, -1) : fullName],
        isDir,
    );
}

describe("test getMockDataOfQiniuPath", () => {
    it("create folder", function () {
        expect(getMockDataOfQiniuPath("createFolder/"))
            .toEqual(
                qiniuPathConvertor.fromQiniuPath("qiniu-client/createFolder/")
            );
    });
});
