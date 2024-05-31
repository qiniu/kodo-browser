import React, {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import {Button, Col, Form, Row, Spinner} from "react-bootstrap";
import {DEFAULT_PORTAL_URL} from "kodo-s3-adapter-sdk/dist/region";

import {translate} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import * as AuditLog from "@renderer/modules/audit-log";
import * as DefaultDict from "@renderer/modules/default-dict";

import RoutePath from "@renderer/pages/route-path";

interface SignInShareFormData {
  shareLink: string,
  extractCode: string,
}

interface ParseShareURLResult {
  apiHost?: string,
  shareId: string,
  shareToken: string,
}

function isPublicShareURL(url: string): boolean {
  const shareURL = new URL(url.trim());
  const defaultPortalURL = new URL(DEFAULT_PORTAL_URL);
  return shareURL.host === defaultPortalURL.host
}

function getCustomApiHost(): string | undefined {
  const customShareUrl = DefaultDict.get("BASE_SHARE_URL");
  if (!customShareUrl) {
    return;
  }
  const customApiHost = new URL(customShareUrl).searchParams.get("apiHost");
  if (!customApiHost) {
    return;
  }
  return customApiHost;
}

function parseShareURL(url: string): ParseShareURLResult | null {
  const shareURL = new URL(url.trim());

  const result = {
    apiHost: shareURL.searchParams.get("apiHost") || undefined,
    shareId: shareURL.searchParams.get("id") || "",
    shareToken: shareURL.searchParams.get("token") || "",
  };

  if (!result.shareId || !result.shareToken) {
    return null;
  }

  return result;
}

interface SignInShareFormProps {
  defaultValues: SignInShareFormData,
}

const SignInShareForm: React.FC<SignInShareFormProps> = ({
  defaultValues,
}) => {
  const navigate = useNavigate();
  const {signInWithShareLink} = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SignInShareFormData>({
    mode: "onSubmit",
    defaultValues,
  });
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues]);

  const handleSignIn: SubmitHandler<SignInShareFormData> = (data) => {
    const parsedShareURL = parseShareURL(data.shareLink);
    if (!parsedShareURL) {
      toast.error(translate("signIn.formShareLink.shareLink.feedback.invalidFormat"));
      return;
    }

    // try to determine the api host from private cloud share link
    const defaultApiHost: string | undefined = isPublicShareURL(data.shareLink)
      ? undefined
      : getCustomApiHost();
    if (
      !isPublicShareURL(data.shareLink) &&
      !parsedShareURL.apiHost &&
      !defaultApiHost
    ) {
      toast.error(translate("signIn.formShareLink.shareLink.feedback.invalidPrivateFormat"));
      return;
    }
    parsedShareURL.apiHost = parsedShareURL.apiHost || defaultApiHost;

    // send sign in request
    const p = signInWithShareLink({
      apiHost: parsedShareURL.apiHost,
      shareId: parsedShareURL.shareId,
      shareToken: parsedShareURL.shareToken,
      extractCode: data.extractCode.trim(),
    });
    p.then(() => {
      navigate(RoutePath.BrowseShare);
      AuditLog.log(AuditLog.Action.Login);
    });
    return toast.promise(p, {
      loading: translate("signIn.form.submit"),
      success: translate("common.success"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  return (
    <Form className="sign-in-form" onSubmit={handleSubmit(handleSignIn)}>
      <fieldset disabled={isSubmitting}>
        <Form.Group as={Row} className="mb-3" controlId="shareUrl">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>
            {translate("signIn.formShareLink.shareLink.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register(
                "shareLink",
                {
                  required: true,
                  validate: (value: string) => {
                    return value.trim().startsWith("http");
                  }
                }
              )}
              as="textarea"
              rows={5}
              style={{
                resize: 'none',
              }}
              placeholder="https://portal.qiniu.com/?id=xxx&token=xxxxxx"
              isInvalid={Boolean(errors.shareLink)}
            />
            <Form.Control.Feedback type="invalid">
              {translate("signIn.formShareLink.shareLink.feedback.invalidFormat")}
            </Form.Control.Feedback>
          </Col>
        </Form.Group>
        <Form.Group as={Row} className="mb-3" controlId="shareUrl">
          <Form.Label className="text-end" column sm={4}>
            <span className="text-danger">*</span>
            {translate("signIn.formShareLink.extractCode.label")}
          </Form.Label>
          <Col sm={7}>
            <Form.Control
              {...register(
                "extractCode",
                {
                  required: true,
                }
              )}
              type="text"
              placeholder={translate("signIn.formShareLink.extractCode.holder")}
              isInvalid={Boolean(errors.extractCode)}
            />
            <Form.Text
              className={
                Boolean(errors.extractCode)
                  ? "text-danger"
                  : ""
              }
            >
              {translate("signIn.formShareLink.extractCode.feedback.invalidFormat")}
            </Form.Text>
          </Col>
        </Form.Group>
      </fieldset>

      <Form.Group as={Row} className="mb-3">
        <Col sm={{span: 7, offset: 4}}>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {
              isSubmitting
                ? <>
                  <Spinner className="me-2" animation="border" size="sm"/>
                  {translate("signIn.form.submitting")}
                </>
                : translate("signIn.form.submit")
            }
          </Button>
        </Col>
      </Form.Group>
    </Form>
  );
};

export default SignInShareForm;
