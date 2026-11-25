// Inside the Playwright container (scripts/visual.sh): forwards localhost:<port> to the same port on the host, so the
// browser and the tests use the same localhost URLs (and session cookies) as on the host.
import net from "node:net";

for (const port of process.argv.slice(2).map(Number)) {
  net
    .createServer((client) => {
      const host = net.connect(port, "host.docker.internal");
      client.pipe(host).pipe(client);
      host.on("error", () => client.destroy());
      client.on("error", () => host.destroy());
    })
    .listen(port, "127.0.0.1");
}
