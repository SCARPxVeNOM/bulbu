// Pre-rendered pictures of Bulbu (shared with the web app) for places where a live 3D view would be too heavy.
export const RENDERS = {
  avatar: require("../../../web/public/renders/avatar.webp"),
  avatarHappy: require("../../../web/public/renders/avatar-happy.webp"),
  outfit: {
    sweater: require("../../../web/public/renders/outfit-sweater.webp"),
    hoodie: require("../../../web/public/renders/outfit-hoodie.webp"),
    none: require("../../../web/public/renders/outfit-none.webp"),
  } as Record<string, number>,
  emote: {
    happy: require("../../../web/public/renders/emote-happy.webp"),
    drained: require("../../../web/public/renders/emote-drained.webp"),
    focused: require("../../../web/public/renders/emote-focused.webp"),
    thriving: require("../../../web/public/renders/emote-thriving.webp"),
    celebrating: require("../../../web/public/renders/emote-celebrating.webp"),
    stressed: require("../../../web/public/renders/emote-stressed.webp"),
  } as Record<string, number>,
};
