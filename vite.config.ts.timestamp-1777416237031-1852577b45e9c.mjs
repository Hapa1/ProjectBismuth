// vite.config.ts
import { defineConfig } from "file:///C:/Users/ryanmoore/Development/ProjectBismuth/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ryanmoore/Development/ProjectBismuth/node_modules/@vitejs/plugin-react/dist/index.js";
import mdx from "file:///C:/Users/ryanmoore/Development/ProjectBismuth/node_modules/@mdx-js/rollup/index.js";
import remarkGfm from "file:///C:/Users/ryanmoore/Development/ProjectBismuth/node_modules/remark-gfm/index.js";
var vite_config_default = defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkGfm]
      })
    },
    react({ include: /\.(jsx|tsx|mdx)$/ })
  ],
  assetsInclude: ["**/*.glsl"]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyeWFubW9vcmVcXFxcRGV2ZWxvcG1lbnRcXFxcUHJvamVjdEJpc211dGhcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHJ5YW5tb29yZVxcXFxEZXZlbG9wbWVudFxcXFxQcm9qZWN0QmlzbXV0aFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvcnlhbm1vb3JlL0RldmVsb3BtZW50L1Byb2plY3RCaXNtdXRoL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBtZHggZnJvbSAnQG1keC1qcy9yb2xsdXAnO1xyXG5pbXBvcnQgcmVtYXJrR2ZtIGZyb20gJ3JlbWFyay1nZm0nO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICB7XHJcbiAgICAgIGVuZm9yY2U6ICdwcmUnLFxyXG4gICAgICAuLi5tZHgoe1xyXG4gICAgICAgIHByb3ZpZGVySW1wb3J0U291cmNlOiAnQG1keC1qcy9yZWFjdCcsXHJcbiAgICAgICAgcmVtYXJrUGx1Z2luczogW3JlbWFya0dmbV0sXHJcbiAgICAgIH0pLFxyXG4gICAgfSxcclxuICAgIHJlYWN0KHsgaW5jbHVkZTogL1xcLihqc3h8dHN4fG1keCkkLyB9KSxcclxuICBdLFxyXG4gIGFzc2V0c0luY2x1ZGU6IFsnKiovKi5nbHNsJ10sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1VLFNBQVMsb0JBQW9CO0FBQ2hXLE9BQU8sV0FBVztBQUNsQixPQUFPLFNBQVM7QUFDaEIsT0FBTyxlQUFlO0FBRXRCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQO0FBQUEsTUFDRSxTQUFTO0FBQUEsTUFDVCxHQUFHLElBQUk7QUFBQSxRQUNMLHNCQUFzQjtBQUFBLFFBQ3RCLGVBQWUsQ0FBQyxTQUFTO0FBQUEsTUFDM0IsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLE1BQU0sRUFBRSxTQUFTLG1CQUFtQixDQUFDO0FBQUEsRUFDdkM7QUFBQSxFQUNBLGVBQWUsQ0FBQyxXQUFXO0FBQzdCLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
