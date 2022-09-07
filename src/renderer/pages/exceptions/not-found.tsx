import React from "react";

interface NotFoundProps {
  location?: string | Partial<Location>;
}

const NotFound: React.FC<NotFoundProps> = (props) => {
  return (
    <>
      <div>404 你来到了无牛问津的地方</div>
      <div>{JSON.stringify(props.location)}</div>
    </>
  )
};

export default NotFound;
