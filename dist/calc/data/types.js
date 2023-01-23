"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var e_1, _a;
exports.__esModule = true;

var util_1 = require("../util");
var RBY = {
    '???': {
        Normal: 1,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 1,
        Roca: 1,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 1
    },
    Normal: {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 1,
        Roca: 0.5,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 0,
        'Dragón': 1
    },
    Planta: {
        '???': 1,
        Normal: 1,
        Planta: 0.5,
        Fuego: 0.5,
        Agua: 2,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 0.5,
        Bicho: 0.5,
        Veneno: 0.5,
        Tierra: 2,
        Roca: 2,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 0.5
    },
    Fuego: {
        '???': 1,
        Normal: 1,
        Planta: 2,
        Fuego: 0.5,
        Agua: 0.5,
        'Eléctrico': 1,
        Hielo: 2,
        Volador: 1,
        Bicho: 2,
        Veneno: 1,
        Tierra: 1,
        Roca: 0.5,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 0.5
    },
    Agua: {
        '???': 1,
        Normal: 1,
        Planta: 0.5,
        Fuego: 2,
        Agua: 0.5,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 2,
        Roca: 2,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 0.5
    },
    'Eléctrico': {
        '???': 1,
        Normal: 1,
        Planta: 0.5,
        Fuego: 1,
        Agua: 2,
        'Eléctrico': 0.5,
        Hielo: 1,
        Volador: 2,
        Bicho: 1,
        Veneno: 1,
        Tierra: 0,
        Roca: 1,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 0.5
    },
    Hielo: {
        '???': 1,
        Normal: 1,
        Planta: 2,
        Fuego: 1,
        Agua: 0.5,
        'Eléctrico': 1,
        Hielo: 0.5,
        Volador: 2,
        Bicho: 1,
        Veneno: 1,
        Tierra: 2,
        Roca: 1,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 2
    },
    Volador: {
        '???': 1,
        Normal: 1,
        Planta: 2,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 0.5,
        Hielo: 1,
        Volador: 1,
        Bicho: 2,
        Veneno: 1,
        Tierra: 1,
        Roca: 0.5,
        Lucha: 2,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 1
    },
    Bicho: {
        '???': 1,
        Normal: 1,
        Planta: 2,
        Fuego: 0.5,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 0.5,
        Bicho: 1,
        Veneno: 2,
        Tierra: 1,
        Roca: 1,
        Lucha: 0.5,
        'Psíquico': 2,
        Fantasma: 0.5,
        'Dragón': 1
    },
    Veneno: {
        '???': 1,
        Normal: 1,
        Planta: 2,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 2,
        Veneno: 0.5,
        Tierra: 0.5,
        Roca: 0.5,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 0.5,
        'Dragón': 1
    },
    Tierra: {
        '???': 1,
        Normal: 1,
        Planta: 0.5,
        Fuego: 2,
        Agua: 1,
        'Eléctrico': 2,
        Hielo: 1,
        Volador: 0,
        Bicho: 0.5,
        Veneno: 2,
        Tierra: 1,
        Roca: 2,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 1
    },
    Roca: {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 2,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 2,
        Volador: 2,
        Bicho: 2,
        Veneno: 1,
        Tierra: 0.5,
        Roca: 1,
        Lucha: 0.5,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 1
    },
    Lucha: {
        '???': 1,
        Normal: 2,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 2,
        Volador: 0.5,
        Bicho: 0.5,
        Veneno: 0.5,
        Tierra: 1,
        Roca: 2,
        Lucha: 1,
        'Psíquico': 0.5,
        Fantasma: 0,
        'Dragón': 1
    },
    'Psíquico': {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 2,
        Tierra: 1,
        Roca: 1,
        Lucha: 2,
        'Psíquico': 0.5,
        Fantasma: 1,
        'Dragón': 1
    },
    Fantasma: {
        '???': 1,
        Normal: 0,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 1,
        Roca: 1,
        Lucha: 1,
        'Psíquico': 0,
        Fantasma: 2,
        'Dragón': 1
    },
    'Dragón': {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 1,
        Roca: 1,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 2
    }
};
var GSC = (0, util_1.extend)(true, {}, RBY, {
    '???': { Siniestro: 1, Acero: 1 },
    Normal: { Siniestro: 1, Acero: 0.5 },
    Planta: { Siniestro: 1, Acero: 0.5 },
    Fuego: { Siniestro: 1, Acero: 2 },
    Agua: { Siniestro: 1, Acero: 1 },
    'Eléctrico': { Siniestro: 1, Acero: 1 },
    Hielo: { Fuego: 0.5, Siniestro: 1, Acero: 0.5 },
    Volador: { Siniestro: 1, Acero: 0.5 },
    Bicho: { Veneno: 0.5, Siniestro: 2, Acero: 0.5 },
    Veneno: { Bicho: 1, Siniestro: 1, Acero: 0 },
    Tierra: { Siniestro: 1, Acero: 2 },
    Roca: { Siniestro: 1, Acero: 0.5 },
    Lucha: { Siniestro: 2, Acero: 2 },
    'Psíquico': { Siniestro: 0, Acero: 0.5 },
    Fantasma: { 'Psíquico': 2, Siniestro: 0.5, Acero: 0.5 },
    'Dragón': { Siniestro: 1, Acero: 0.5 },
    Siniestro: {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 1,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 1,
        Roca: 1,
        Lucha: 0.5,
        'Psíquico': 2,
        Fantasma: 2,
        'Dragón': 1,
        Siniestro: 0.5,
        Acero: 0.5
    },
    Acero: {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 0.5,
        Agua: 0.5,
        'Eléctrico': 0.5,
        Hielo: 2,
        Volador: 1,
        Bicho: 1,
        Veneno: 1,
        Tierra: 1,
        Roca: 2,
        Lucha: 1,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 1,
        Siniestro: 1,
        Acero: 0.5
    }
});
var ADV = GSC;
var DPP = GSC;
var BW = GSC;
var XY = (0, util_1.extend)(true, {}, GSC, {
    '???': { Hada: 1 },
    Normal: { Hada: 1 },
    Planta: { Hada: 1 },
    Fuego: { Hada: 1 },
    Agua: { Hada: 1 },
    'Eléctrico': { Hada: 1 },
    Hielo: { Hada: 1 },
    Volador: { Hada: 1 },
    Bicho: { Hada: 0.5 },
    Veneno: { Hada: 2 },
    Tierra: { Hada: 1 },
    Roca: { Hada: 1 },
    Lucha: { Hada: 0.5 },
    'Psíquico': { Hada: 1 },
    Fantasma: { Acero: 1, Hada: 1 },
    'Dragón': { Hada: 0 },
    Siniestro: { Acero: 1, Hada: 0.5 },
    Acero: { Hada: 2 },
    Hada: {
        '???': 1,
        Normal: 1,
        Planta: 1,
        Fuego: 0.5,
        Agua: 1,
        'Eléctrico': 1,
        Hielo: 1,
        Volador: 1,
        Bicho: 1,
        Veneno: 0.5,
        Tierra: 1,
        Roca: 1,
        Lucha: 2,
        'Psíquico': 1,
        Fantasma: 1,
        'Dragón': 2,
        Siniestro: 2,
        Acero: 0.5,
        Hada: 1
    }
});
var SM = XY;
var SS = SM;
var SV = SS;
exports.TYPE_CHART = [{}, RBY, GSC, ADV, DPP, BW, XY, SM, SS, SV];
var Types = (function () {
    function Types(gen) {
        this.gen = gen;
    }
    Types.prototype.get = function (id) {
        return TYPES_BY_ID[this.gen][id];
    };
    Types.prototype[Symbol.iterator] = function () {
        var _a, _b, _c, _i, id;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = TYPES_BY_ID[this.gen];
                    _b = [];
                    for (_c in _a)
                        _b.push(_c);
                    _i = 0;
                    _d.label = 1;
                case 1:
                    if (!(_i < _b.length)) return [3, 4];
                    _c = _b[_i];
                    if (!(_c in _a)) return [3, 3];
                    id = _c;
                    return [4, this.get(id)];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3, 1];
                case 4: return [2];
            }
        });
    };
    return Types;
}());
exports.Types = Types;
var Type = (function () {
    function Type(name, effectiveness) {
        this.kind = 'Type';
        this.id = (0, util_1.toID)(name);
        this.name = name;
        this.effectiveness = effectiveness;
    }
    return Type;
}());
var TYPES_BY_ID = [];
try {
    for (var TYPE_CHART_1 = __values(exports.TYPE_CHART), TYPE_CHART_1_1 = TYPE_CHART_1.next(); !TYPE_CHART_1_1.done; TYPE_CHART_1_1 = TYPE_CHART_1.next()) {
        var typeChart = TYPE_CHART_1_1.value;
        var map = {};
        for (var type in typeChart) {
            var t = new Type(type, __assign({}, typeChart[type]));
            map[t.id] = t;
        }
        TYPES_BY_ID.push(map);
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (TYPE_CHART_1_1 && !TYPE_CHART_1_1.done && (_a = TYPE_CHART_1["return"])) _a.call(TYPE_CHART_1);
    }
    finally { if (e_1) throw e_1.error; }
}
//# sourceMappingURL=types.js.map