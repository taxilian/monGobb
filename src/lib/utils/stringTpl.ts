/**
 * Use this with a template literal in order to create reusable string template;
 * use interpolation to add strings for each variable you want to use in the template.
 * 
 * e.g.:
 * 
 *  const reUsableStringTemplate = stringTpl`${'name'} and ${'otherName'} are going to ${'place'}`;
 * 
 * You can then call it with:
 * 
 *  const filled = reUsableStringTemplate({name: 'John', otherName: 'Jane', place: 'Paris'});
 *  // John and Jane are going to Paris
 * 
 * reUsableStringTemplate will have types and know the names of your variables
 * 
 * @returns String template function with full typescript types
 */
 export default function stringTpl<keys extends string>(parts: TemplateStringsArray, ...keys: keys[]) {
  return (opts: Record<keys, any>) => {
    let outStr = '';
    for (let i = 0; i < parts.length; ++i) {
      outStr += parts[i];
      const key = keys.shift();
      if (key && key in opts) {
        outStr += opts[key];
      } else {
        outStr += key ?? '';
      }
    }
    return outStr;
  };
}

