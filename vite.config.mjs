var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Runs the same /api handlers locally under `npm run dev`, backed by the
// in-memory store. In production Vercel serves api/*.ts as real functions.
function devApi() {
    return {
        name: "pokedraft-dev-api",
        configureServer: function (server) {
            var _this = this;
            var middleware = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var url, path, mod, handle, submitRun_1, getLeaderboard_1, result, body_1, limit_1, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            url = req.url || "";
                            if (!url.startsWith("/api/"))
                                return [2 /*return*/, next()];
                            path = url.split("?")[0];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 13, , 14]);
                            return [4 /*yield*/, server.ssrLoadModule("/api/_lib/handlers.ts")];
                        case 2:
                            mod = _a.sent();
                            handle = mod.handle, submitRun_1 = mod.submitRun, getLeaderboard_1 = mod.getLeaderboard;
                            result = void 0;
                            if (!(path === "/api/submit")) return [3 /*break*/, 7];
                            if (!(req.method === "POST")) return [3 /*break*/, 5];
                            return [4 /*yield*/, readBody(req)];
                        case 3:
                            body_1 = _a.sent();
                            return [4 /*yield*/, handle(function () { return submitRun_1(body_1); })];
                        case 4:
                            result = _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            result = { status: 405, json: { error: "Method not allowed" } };
                            _a.label = 6;
                        case 6: return [3 /*break*/, 12];
                        case 7:
                            if (!(path === "/api/leaderboard")) return [3 /*break*/, 11];
                            if (!(req.method === "GET")) return [3 /*break*/, 9];
                            limit_1 = Number(new URL(url, "http://localhost").searchParams.get("limit")) || undefined;
                            return [4 /*yield*/, handle(function () { return getLeaderboard_1({ limit: limit_1 }); })];
                        case 8:
                            result = _a.sent();
                            return [3 /*break*/, 10];
                        case 9:
                            result = { status: 405, json: { error: "Method not allowed" } };
                            _a.label = 10;
                        case 10: return [3 /*break*/, 12];
                        case 11:
                            result = { status: 404, json: { error: "Not found" } };
                            _a.label = 12;
                        case 12:
                            res.statusCode = result.status;
                            res.setHeader("content-type", "application/json");
                            res.end(JSON.stringify(result.json));
                            return [3 /*break*/, 14];
                        case 13:
                            e_1 = _a.sent();
                            server.config.logger.error("[dev-api] ".concat(String(e_1)));
                            res.statusCode = 500;
                            res.setHeader("content-type", "application/json");
                            res.end(JSON.stringify({ error: "dev api error" }));
                            return [3 /*break*/, 14];
                        case 14: return [2 /*return*/];
                    }
                });
            }); };
            // The app only calls POST /api/submit and GET /api/leaderboard, both of
            // which this handles. (A bare GET /api/submit may be served as source by
            // Vite's file middleware in dev — irrelevant; on Vercel it's a real 405.)
            server.middlewares.use(middleware);
        },
    };
}
function readBody(req) {
    return new Promise(function (resolve) {
        var data = "";
        req.on("data", function (chunk) { return (data += chunk); });
        req.on("end", function () {
            try {
                resolve(data ? JSON.parse(data) : {});
            }
            catch (_a) {
                resolve({});
            }
        });
        req.on("error", function () { return resolve({}); });
    });
}
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), devApi()],
});
