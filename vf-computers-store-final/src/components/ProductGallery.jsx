import React from "react";
import { getOptimizedImageUrl, restoreOriginalImage } from "../utils/images";

export default function ProductGallery({ images, selectedImage, setSelectedImage, productName }) {
  return (
    <div className="product-page-gallery">
      <div className="product-page-thumbs">
        {images.map((image, index) => (
          <button
            key={index}
            className={selectedImage === index ? "active" : ""}
            onClick={() => setSelectedImage(index)}
          >
            <img
              src={getOptimizedImageUrl(image, 160, 72)}
              alt=""
              loading="lazy"
              decoding="async"
              width="160"
              height="120"
              onError={(event) => restoreOriginalImage(event, image)}
            />
          </button>
        ))}
      </div>

      <div className="product-page-main-image">
        <img
          src={getOptimizedImageUrl(images[selectedImage], 1200, 82)}
          alt={productName}
          decoding="async"
          width="1200"
          height="900"
          onError={(event) => restoreOriginalImage(event, images[selectedImage])}
        />
      </div>
    </div>
  );
}
