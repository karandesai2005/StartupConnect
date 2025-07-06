const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/heic", "image/heif"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/mov"]);

const profileFileFilter = (req, file, cb) => {
  if (imageTypes.has(file.mimetype)) {
    return cb(null, true);
  } else {
    return cb(new Error("Only JPEG, PNG, GIF, HEIC, or HEIF allowed for profile pictures"), false);
  }
};

const postFileFilter = (req, file, cb) => {
  const isImage = imageTypes.has(file.mimetype);
  const isVideo = videoTypes.has(file.mimetype);

  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  const isImageByExt = ['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif'].includes(fileExtension);
  const isVideoByExt = ['mp4', 'mov', 'quicktime'].includes(fileExtension);

  if (isImage || isVideo || isImageByExt || isVideoByExt) {
    if (!isImage && !isVideo) {
      if (isVideoByExt) {
        file.mimetype = 'video/mp4';
      } else if (isImageByExt) {
        file.mimetype = fileExtension === 'heic' || fileExtension === 'heif' ? 'image/heic' : 'image/jpeg';
      }
    }
    return cb(null, true);
  } else {
    return cb(
      new Error("Only images (JPEG, PNG, GIF, HEIC, HEIF) and videos (MP4, MOV) allowed for posts"),
      false
    );
  }
};

const limits = {
  profile: { fileSize: 5 * 1024 * 1024 },
  post: { fileSize: 100 * 1024 * 1024 },
};

const uploadProfilePicture = multer({
  storage: memoryStorage,
  fileFilter: profileFileFilter,
  limits: limits.profile,
}).single("profile_picture");

const uploadPostMedia = multer({
  storage: memoryStorage,
  fileFilter: postFileFilter,
  limits: limits.post,
}).single("media");

module.exports = {
  uploadProfilePicture,
  uploadPostMedia,
};