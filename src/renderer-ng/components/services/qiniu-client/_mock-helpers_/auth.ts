import * as AuthInfo from "@/components/services/authinfo";

export const QINIU_ACCESS_KEY = "NgKd0BmebvsFERFEBfKVVZGeGn7VsZQe_H_AunOC";
export const QINIU_SECRET_KEY = "lp4Zv3Gi_7CHtxNTcJx2Pum5hUJB3gHROcg4vp0i";

let oldAuthInfo = AuthInfo.get();
let oldCloud = AuthInfo.usePublicCloud();

export function mockPublicAuthInfo() {
    oldAuthInfo = AuthInfo.get();
    oldCloud = AuthInfo.usePublicCloud();
    AuthInfo.switchToPublicCloud();
    AuthInfo.remove();
    AuthInfo.save({
        id: QINIU_ACCESS_KEY,
        secret: QINIU_SECRET_KEY,
        description: "kodo-qiniu-dev",
        isPublicCloud: true,
        isAuthed: true,
    });
}

export function resetAuthInfo() {
    if (oldCloud) {
        AuthInfo.switchToPublicCloud();
    } else {
        AuthInfo.switchToPrivateCloud();
    }
    AuthInfo.remove();
    AuthInfo.save(oldAuthInfo);
}
