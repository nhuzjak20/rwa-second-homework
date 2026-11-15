'use strict';


const flags = {
  sqliVulnerable: false,
  authVulnerable: false,
};

//svičevi za ui
const TOGGLES = {
  sqli: 'sqliVulnerable',
  auth: 'authVulnerable',
};

function setFlag(name, value) {
  const key = TOGGLES[name];
  if (!key) {
    throw new Error(`Unknown toggle: ${name}`);
  }
  flags[key] = typeof value === 'boolean' ? value : !flags[key];
  return flags[key];
}

module.exports = { flags, TOGGLES, setFlag };
