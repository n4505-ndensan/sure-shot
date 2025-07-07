import { Component } from "solid-js";
import { arrayBufferToBase64 } from "../../../utils/FileUtils";

interface Props {
  onImageLoadStart?: () => void;
  onImageLoad?: (base64Images: string[]) => void;
  onImageLoadEnd?: () => void;
}

export const AddImageButton: Component<Props> = (props) => {
  let fileInput: HTMLInputElement | undefined;

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const files = e.currentTarget.files;
          if (files) {
            props.onImageLoadStart?.();

            const arrayBuffers = await Promise.all(
              Array.from(files).map(async (file) => {
                return await file.arrayBuffer();
              })
            );
            const base64Images = arrayBuffers.map((buffer) =>
              arrayBufferToBase64(buffer)
            );

            props.onImageLoad?.(base64Images);

            // const imageUrls = Array.from(files).map((file) =>
            //   URL.createObjectURL(file)
            // );
            // props.onImagesSelected?.(imageUrls);
          }
          props.onImageLoadEnd?.();
        }}
      />
      <img
        src={"/folder.png"}
        width={12}
        height={12}
        style={{
          width: "12px",
          height: "12px",
          cursor: "pointer",
          "pointer-events": "all",
          "image-rendering": "pixelated",
        }}
        onClick={() => {
          fileInput?.click();
        }}
      />
    </>
  );
};
