import { useEffect } from "react";

export const useScrollTop = (dependency) => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [dependency]);
};
