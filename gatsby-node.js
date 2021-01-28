const report = require('gatsby-cli/lib/reporter');
const firebase = require('firebase-admin');
const crypto = require('crypto');

const getDigest = (id) => crypto.createHash('md5').update(id).digest('hex');

exports.sourceNodes = async (
  { boundActionCreators },
  { types, credential, appConfig }
) => {
  try {
    if (firebase.apps || !firebase.apps.length) {
      const cfg = appConfig
        ? appConfig
        : { credential: firebase.credential.cert(credential) };
      firebase.initializeApp(cfg);
    }
  } catch (e) {
    report.warn(
      'Could not initialize Firebase. Please check `credential` property in gatsby-config.js'
    );
    report.warn(e);
    return;
  }
  const db = firebase.firestore();
  db.settings({
    timestampsInSnapshots: true,
  });

  const { createNode, createTypes } = boundActionCreators;

  const promises = types.map(
    async ({ collection, type, nodeCreateType, map = (node) => node }) => {
      const snapshot = await db.collection(collection).get();

      if (nodeCreateType) {
        createTypes(nodeCreateType);
      }

      for (let doc of snapshot.docs) {
        const contentDigest = getDigest(doc.id);
        createNode({
          ...map(doc.data()),
          id: doc.id,
          parent: null,
          children: [],
          internal: {
            type,
            contentDigest,
          },
        });
      }
    }
  );
  await Promise.all(promises);
};
