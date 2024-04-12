import {AkItem, SignInWithShareLinkOptions, SignInWithShareSessionOptions} from "@renderer/modules/auth"
import {OptionalProps} from "@common/utility-types";

enum RoutePath {
  Root = "/",
  SignIn = "/sign-in",
  Browse = "/browse",
  BrowseShare = "/browse-share",
  SignOut = "/sign-out",
  SwitchUser = "/switch-user",
}

export interface ISignInState {
  // type: "ak" | "shareLink",
  type: "shareLink",
  data: OptionalProps<SignInWithShareLinkOptions, "extractCode">,
}

export type SignInState = ISignInState | undefined;

export interface ISignOutState {
  type: "signInState",
  data: SignInState,
}

export type SignOutState = ISignOutState | undefined;

interface SwitchUserStateBase {
  type: "ak" | "shareSession",
}

export interface SwitchUserStateAk extends SwitchUserStateBase {
  type: "ak",
  data: {
    akItem: AkItem,
  },
}

export interface SwitchUserStateSession extends SwitchUserStateBase {
  type: "shareSession",
  data: SignInWithShareSessionOptions,
}

export type SwitchUserState = SwitchUserStateAk | SwitchUserStateSession | undefined;

export default RoutePath;
