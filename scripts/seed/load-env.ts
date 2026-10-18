// Importado antes de tudo no seed: `import` é avaliado em ordem, e o env() do servidor fica em cache no primeiro uso.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
