import React from "react";

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
            <img src={image} alt="" />
          </button>
        ))}
      </div>

      <div className="product-page-main-image">
        <img src={images[selectedImage]} alt={productName} />
      </div>
    </div>
  );
}
