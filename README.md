# IMPORTANT


First thing is first: This is not `mongoBB`, this is `monGobb` -- it's pronounced lib `mon-gobb` (rhymes with blob)

The source of the name is long, storied, and none of your business. We hate naming things. Feel free to fork,
rename, and make this an incredibly powerful project that we don't have to maintain anymore but solves all our
problems!

Moving on.

-----------

## Project goals


### Goal overview

We have used and loved the mongoose project for a lot of years -- and still do -- but increasingly
have been frustrated that the typescript integration isn't quite what we want and that it has some
places where it's just overly heavy on the API -- largely due to maintaining old patterns which made
a lot of sense when they were created. We wanted to go more lean on this abstraction, but still
get some of the key things that we cared about from mongoose. We also wanted to make use of some
new technologies and capabilities -- most particularly JSON Schema.

### Goal specifics

* This is a typescript project. It could probably be used in javascript, but no effort has been made
  to figure out how that would work or how to do it. That might change some day, but that day is not today -- and tomorrow isn't looking good for it either.
* Only define the schema in one place -- specifically using JSON Schema -- and have all code
  generated automatically from that Single Source of Truth (`SSoT™`)
* Server-side validation / schemas should be supported as a primary feature
* It should support simple type coercion, e.g. automatically convert to the field type on assignment if needed
  * For example, we really like being able to just assign a string to an objectid field, a number to a string field, or a string to a number field and have it Just Do the Right Thing (`JDtRT™`)
* It should not reinvenit the wheel except where absolutely necessary and should mainly be a
  lightweight wrapper and helper around the node mongo client
* Data objects are always stored as just data objects -- never as a rich object which contains data.
  *however*, we do kinda like having the ability to have "smart objects" sometimes, so we support
  wrapping database objects in a ES6 Proxy wrapper which still maintains the original document as a
  raw object but can take care of the type coersion, real time schema validation, etc.
* Data operations should be done using a Model object (e.g. `UserModel.save(doc)`) and not using
  functions on the object itself (e.g. `doc.save()`). That said, we'll not stop you from adding things
  like that if you want.

## Current project state

This project currently is usable but is very young; validation and checks are only supported for
base level properties, not for nested arrays or documents, and the schema validation support and
support for defaults is not as good as we'd like it to be. We'd love to have you help!

## Typescript 

While our original plan was to use native typescript type inference to create our interfaces,
we have found that the JSON schema spec is just too complicated to do this reasonably. Instead,
we are using [json-schema-to-typescript](https://www.npmjs.com/package/json-schema-to-typescript)
to translate the schema to typescript automatically and have provided a tool to help you do that.