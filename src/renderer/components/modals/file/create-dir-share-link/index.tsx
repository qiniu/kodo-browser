import {clipboard} from "electron";

import React, {ChangeEventHandler, Fragment, useEffect, useMemo, useState} from "react";
import {Button, Form, InputGroup, Modal, ModalProps, Spinner} from "react-bootstrap";
import {toast} from "react-hot-toast";
import {SubmitHandler, useForm} from "react-hook-form";
import moment from "moment";
import {DEFAULT_PORTAL_URL} from "kodo-s3-adapter-sdk/dist/region";

import Duration from "@common/const/duration";
import {ALPHANUMERIC} from "@common/const/str";
import {Alphanumeric} from "@renderer/const/patterns";

import {useI18n} from "@renderer/modules/i18n";
import {useAuth} from "@renderer/modules/auth";
import {createShare, FileItem} from "@renderer/modules/qiniu-client";

interface CreateDirShareLinkProps {
  bucketName: string,
  fileItem: FileItem.Folder | null,
}

interface CreateDirShareLinkFormData {
  expireAfter: number, // seconds
  extractCode: string,
}

function genAlphanumericCode(len: number): string {
  return "0".repeat(len)
    .split("")
    .map(() => {
      const i = Math.floor(Math.random() * ALPHANUMERIC.length);
      return ALPHANUMERIC[i];
    })
    .join("");
}

const CreateDirShareLink: React.FC<ModalProps & CreateDirShareLinkProps> = (props) => {
  const {
    regionId,
    bucketName,
    fileItem,
    ...modalProps
  } = props;

  const {translate} = useI18n();
  const {currentUser} = useAuth();

  // cache operation states prevent props update after modal opened.
  const {
    memoFileItem,
    memoBucketName,
  } = useMemo(() => ({
    memoFileItem: fileItem,
    memoBucketName: bucketName,
  }), [modalProps.show]);


  // form state
  const {
    handleSubmit,
    register,
    reset,
    setValue,
    getValues,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<CreateDirShareLinkFormData>({
    mode: "onChange",
  });

  const [expireAfterPreset, setExpireAfterPreset] = useState(Duration.Hour / Duration.Second);
  const handleSelectExpireAfter: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const expireAfter = parseInt(event.target.value);
    setExpireAfterPreset(expireAfter);
    if (expireAfter > 0) {
      setValue("expireAfter", expireAfter);
    }
  }

  // result state
  const [shareLink, setShareLink] = useState("")
  const [expiredAt, setExpiredAt] = useState("");

  // handlers
  const handleRandomExtractCode = () => {
    setValue("extractCode", genAlphanumericCode(6));
  };

  const handleSubmitCreateShareLink: SubmitHandler<CreateDirShareLinkFormData> = async (data) => {
    if (!memoFileItem || !currentUser) {
      return;
    }

    const p = createShare(
      {
        bucket: memoBucketName,
        prefix: memoFileItem?.path.toString(),
        durationSeconds: data.expireAfter,
        extractCode: data.extractCode,
        permission: "READONLY",
      },
      {
        apiUrls: [],
        accessKey: currentUser.accessKey,
        accessSecret: currentUser.accessSecret,
        endpointType: currentUser.endpointType,
      },
    );

    p.then(shareInfo => {
      const shareURL = new URL(`${DEFAULT_PORTAL_URL}/kodo-shares/verify`);
      shareURL.searchParams.set("id", shareInfo.id);
      shareURL.searchParams.set("token", shareInfo.token);
      setShareLink(shareURL.toString());
      setExpiredAt(shareInfo.expires);
    });

    return toast.promise(p, {
      loading: translate("common.submitting"),
      success: translate("common.submitted"),
      error: err => `${translate("common.failed")}: ${err}`,
    });
  };

  const handleCopyShareLink = () => {
    const text = translate(
      "modals.createDirectoryShareLink.shareMessage",
      {
        shareLink,
        extractCode: getValues("extractCode"),
        expiredAt: moment(expiredAt).format("YYYY-MM-DD HH:mm:ss"),
      },
    );
    clipboard.writeText(text);
    toast.success(translate("modals.createDirectoryShareLink.copyShareMessageSuccess"));
  }

  // hooks for modal show/close
  useEffect(() => {
    if (modalProps.show) {
      const expireAfterDefaultValue = Duration.Hour / Duration.Second;
      reset({
        expireAfter: expireAfterDefaultValue,
        extractCode: genAlphanumericCode(6),
      });
      setExpireAfterPreset(expireAfterDefaultValue);
    } else {
      setShareLink("");
      setExpiredAt("");
    }
  }, [modalProps.show]);

  // render
  const Content = () => {
    if (!memoFileItem) {
      return (
        <div>
          {translate("common.noObjectSelected")}
        </div>
      );
    }

    if (shareLink) {
      return (
        <Form
          className="mx-5"
        >
          <fieldset className="grid-auto grid-form label-col-1">
            <Form.Group as={Fragment} controlId="shareLink">
              <Form.Label className="text-end">
                {translate("modals.createDirectoryShareLink.form.shareLink.label")}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                style={{
                  resize: 'none',
                }}
                readOnly
                value={shareLink}
              />
            </Form.Group>
            <Form.Group as={Fragment} controlId="extractCode">
              <Form.Label className="text-end">
                {translate("modals.createDirectoryShareLink.form.extractCode.label")}
              </Form.Label>
              <Form.Control plaintext readOnly value={getValues("extractCode")}/>
            </Form.Group>
            <Form.Group as={Fragment} controlId="directoryName">
              <Form.Label className="text-end">
                {translate("modals.createDirectoryShareLink.form.expireAt.label")}
              </Form.Label>
              <Form.Control
                plaintext
                readOnly
                value={moment(expiredAt).format("YYYY-MM-DD HH:mm:ss")}
              />
            </Form.Group>
          </fieldset>
        </Form>
      );
    }

    return (
      <Form
        className="mx-5"
        onSubmit={handleSubmit(handleSubmitCreateShareLink)}
      >
        <fieldset
          className="grid-auto grid-form label-col-1"
          disabled={isSubmitting}
        >
          <Form.Group as={Fragment} controlId="directoryName">
            <Form.Label className="text-end">
              {translate("modals.createDirectoryShareLink.form.directoryName.label")}
            </Form.Label>
            <div>
              <Form.Control
                plaintext
                readOnly
                defaultValue={`${memoFileItem.name}/`}
              />
            </div>
          </Form.Group>
          <Form.Group as={Fragment} controlId="expireAfter">
            <Form.Label className="text-end">
              {translate("modals.createDirectoryShareLink.form.expireAfter.label")}
            </Form.Label>
            <InputGroup>
              <Form.Select
                value={expireAfterPreset}
                onChange={handleSelectExpireAfter}
              >
                <option value={-1}>{translate("common.custom")}</option>
                <option value={15 * Duration.Minute / Duration.Second}>15 {translate("common.minutes")}</option>
                <option value={30 * Duration.Minute / Duration.Second}>30 {translate("common.minutes")}</option>
                <option value={Duration.Hour / Duration.Second}>1 {translate("common.hour")}</option>
                <option value={2 * Duration.Hour / Duration.Second}>2 {translate("common.hours")}</option>
              </Form.Select>
              {
                expireAfterPreset > 0
                  ? null
                  : <>
                    <Form.Control
                      {...register("expireAfter", {
                        required: true,
                      })}
                      type="number"
                      isInvalid={Boolean(errors.extractCode)}
                    />
                    <InputGroup.Text>
                      {translate("modals.createDirectoryShareLink.form.expireAfter.suffix")}
                    </InputGroup.Text>
                  </>
              }
            </InputGroup>
          </Form.Group>
          <Form.Group as={Fragment} controlId="fileName">
            <Form.Label className="text-end">
              {translate("modals.createDirectoryShareLink.form.extractCode.label")}
            </Form.Label>
            <div>
              <InputGroup>
                <Form.Control
                  {...register("extractCode", {
                    required: true,
                    validate: v => v.length === 6 && Alphanumeric.test(v),
                  })}
                  type="text"
                  isInvalid={Boolean(errors.extractCode)}
                />
                <Button
                  variant="outline-solid-gray-400"
                  onClick={handleRandomExtractCode}
                >
                  <i className="bi bi-shuffle me-1"/>
                  {translate("modals.createDirectoryShareLink.form.extractCode.suffix")}
                </Button>
              </InputGroup>
              <Form.Text
                className={
                  Boolean(errors.extractCode)
                    ? "text-danger"
                    : ""
                }
              >
                {translate("modals.createDirectoryShareLink.form.extractCode.hint")}
              </Form.Text>
            </div>
          </Form.Group>
        </fieldset>
      </Form>
    );
  }

  const Footer = () => {
    return (
      <>
        {
          !shareLink
            ? <Button
              variant="primary"
              size="sm"
              disabled={!shareLink && isSubmitting}
              onClick={handleSubmit(handleSubmitCreateShareLink)}
            >
              {
                isSubmitting
                  ? <>
                    <Spinner className="me-1" animation="border" size="sm"/>
                    {translate("common.submitting")}
                  </>
                  : translate("common.submit")
              }
            </Button>
            : <Button size="sm" onClick={handleCopyShareLink}>
              {translate("modals.createDirectoryShareLink.copyShareMessageButton")}
            </Button>
        }
        <Button
          variant="light"
          size="sm"
          onClick={modalProps.onHide}
        >
          {translate("common.close")}
        </Button>
      </>
    );
  };

  return (
    <Modal {...modalProps}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-share me-1"/>
          {translate("modals.createDirectoryShareLink.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Content/>
      </Modal.Body>
      <Modal.Footer>
        <Footer/>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateDirShareLink;
