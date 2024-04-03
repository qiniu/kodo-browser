import React, {useEffect, useState} from "react";
import {Button, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {Placement} from "react-bootstrap/types";
import {ButtonProps} from "react-bootstrap/Button";

let hideOthersTooltip = () => {};

interface TooltipButtonProps {
  iconClassName: string,
  tooltipPlacement?: Placement,
  tooltipContent: string,
  show?: boolean,
  loading?: boolean,
}

const TooltipButton: React.FC<ButtonProps & TooltipButtonProps> = (props) => {
  const {
    iconClassName,
    tooltipPlacement,
    tooltipContent,
    show,
    loading = false,
    ...buttonProps
  } = props;

  const [showTip, setShowTip] = useState<boolean>();

  useEffect(() => {
    handleToggleTooltip(show);
  }, [show]);

  const handleToggleTooltip = (nextShow?: boolean) => {
    if (buttonProps.disabled) {
      setShowTip(false);
      return;
    }

    // only keep one tooltip.
    // prevent tips overlap each other if them too close.
    if (nextShow) {
      hideOthersTooltip();
      hideOthersTooltip = () => { setShowTip(false); };
    }
    setShowTip(nextShow);
  }

  return (
    <OverlayTrigger
      show={showTip}
      placement={tooltipPlacement ?? "auto"}
      onToggle={handleToggleTooltip}
      overlay={
        <Tooltip>
          {tooltipContent}
        </Tooltip>
      }
    >
      <Button
        variant="outline-solid-gray-300"
        {...buttonProps}
        disabled={buttonProps.disabled || loading}
      >
        {
          loading
            ? <Spinner animation="border"/>
            : <i className={iconClassName}/>
        }
      </Button>
    </OverlayTrigger>
  )
}

export default TooltipButton;
