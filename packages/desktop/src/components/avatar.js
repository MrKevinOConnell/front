import React from "react";
import { css } from "@emotion/react";
import generateAvatar from "../utils/avatar-generator";

// Caching expensive avatar generation outside of react so that we can share
// between multiple component instances
const cache = new Map();

export const generateCachedAvatar = (walletAddress, { pixelSize }) => {
  const size = 8;

  const cacheKey = [walletAddress, pixelSize, size].join("-");

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const avatar = generateAvatar({
    seed: walletAddress,
    size,
    scale: Math.ceil((pixelSize * 2) / size),
  });

  cache.set(cacheKey, avatar);

  return avatar;
};

const Avatar = React.forwardRef(
  (
    {
      url,
      walletAddress,
      size = "2rem",
      pixelSize = 20,
      borderRadius = "0.3rem",
      ...props
    },
    ref
  ) => {
    const avatarDataUrl = React.useMemo(() => {
      if (url != null || walletAddress == null) return;
      return generateCachedAvatar(walletAddress, { pixelSize });
    }, [url, walletAddress, pixelSize]);

    if (url === undefined)
      return (
        <div
          ref={ref}
          css={(theme) =>
            css({
              borderRadius,
              background: theme.colors.backgroundSecondary,
              height: size,
              width: size,
            })
          }
          {...props}
        />
      );

    return (
      <img
        ref={ref}
        src={url ?? avatarDataUrl}
        loading="lazy"
        css={(theme) =>
          css({
            borderRadius,
            background: theme.colors.backgroundSecondary,
            height: size,
            width: size,
            objectFit: "cover",
          })
        }
        {...props}
      />
    );
  }
);

export default Avatar;
