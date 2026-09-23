import { createRoot } from 'react-dom/client';
import { parseConfig } from '../common/config';
import { App } from './App';
import { fetchFields } from './fields';

((PLUGIN_ID: string) => {
  const container = document.getElementById('plugin-config-root');
  if (!container) return;

  createRoot(container).render(
    <App
      initialConfig={parseConfig(kintone.plugin.app.getConfig(PLUGIN_ID))}
      loadFields={fetchFields}
      // コールバックを省略すると、保存後に kintone がプラグイン一覧へ戻す
      save={(config) => kintone.plugin.app.setConfig(config)}
      cancel={() => window.history.back()}
    />,
  );
})(kintone.$PLUGIN_ID);
