
// Use this to define keys which should be removed from the json schema before sending it to mongodb
// for use as a validation document
const stripKeys = ['tsType', 'defaultAuto'];

/**
 * This function goes through the json schema object and removes keys (in-place) which
 * mongodb will puke on if they are still there -- currently that's just the tsType key
 * which is needed to allow us to tell typescript what things are
 * @param obj JSON schema object to preprocess
 * @returns 
 */
export default function stripSchema(obj: any, keysToStrip = stripKeys) {
  if (typeof obj !== 'object') { return obj; }
  for (const k of keysToStrip) {
    if (k in obj) {
      delete obj[k];
    }
  }
  for (const k of Object.keys(obj)) {
    if (Array.isArray(obj[k])) {
      obj[k] = obj[k].map(stripSchema);
    } else if (typeof obj[k] === 'object') {
      obj[k] = stripSchema(obj[k]);
    }
  }
  return obj;
}
