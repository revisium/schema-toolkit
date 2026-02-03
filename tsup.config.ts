import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'plugins/index': 'src/plugins/index.ts',
    'mocks/index': 'src/mocks/index.ts',
    'consts/index': 'src/consts/index.ts',
    'model/index': 'src/model/index.ts',
    'lib/index': 'src/lib/index.ts',
    'validation-schemas/index': 'src/validation-schemas/index.ts',
    'formula/index': 'src/formula/index.ts',
    'core/index': 'src/core/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['events'],
  noExternal: [],
});
