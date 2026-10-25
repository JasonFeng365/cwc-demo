window.CONFIG_READY = fetch(new URL('../config.json', document.currentScript.src))
  .then((response) => {
    if (!response.ok) throw new Error('Could not load config.json');
    return response.json();
  })
  .then((config) => {
    if (!config.backend) throw new Error('config.json is missing "backend"');
    window.APP_CONFIG = config;
    return config;
  });
