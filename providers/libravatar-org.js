const got = require('got');

const cache = new Map();

module.exports = async (emailHash, targetSize, response) => {
  const libravatarUrl = `https://cdn.libravatar.org/avatar/${ emailHash }?s=${ targetSize }&d=404`;

  if (cache.has(libravatarUrl)) {
    return  cache.get(libravatarUrl);
  }

  try {
    const { body } = await got(libravatarUrl, {
      encoding: null,
    });

    cache.set(libravatarUrl, body);

    return body;
  } catch (error) {
    return false;
  }
}
