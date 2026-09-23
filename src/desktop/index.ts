import { parseConfig } from '../common/config';
import { registerPlugin } from './plugin';

((PLUGIN_ID: string) => {
  const config = parseConfig(kintone.plugin.app.getConfig(PLUGIN_ID));
  registerPlugin(config, kintone);
})(kintone.$PLUGIN_ID);
