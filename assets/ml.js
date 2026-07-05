/* Manifold — ML math. Plain script, exposes window.ML. No dependencies. */
(function () {
  const ML = {};

  ML.rand = function (seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };

  // Two-blob classification dataset
  ML.genBlobs = function (seed, n = 90, spreadA = 0.22, spreadB = 0.22) {
    const r = ML.rand(seed * 1000 + 3);
    const pts = [];
    const blob = (cx, cy, count, label, sp) => {
      for (let i = 0; i < count; i++) {
        const a = r() * 6.283, d = Math.sqrt(r()) * sp;
        pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 1.05, label });
      }
    };
    blob(0.30, 0.34, Math.round(n * 0.5), 0, spreadA);
    blob(0.68, 0.64, Math.round(n * 0.5), 1, spreadB);
    return pts.filter(p => p.x > 0.03 && p.x < 0.97 && p.y > 0.04 && p.y < 0.96);
  };

  // Wavy-boundary dataset with label noise + held-out set
  ML.genWavy = function (seed, n = 90, heldOut = 18) {
    const r = ML.rand(seed * 1000 + 17);
    const phase = r() * 6.283;
    const f = (x) => 0.5 + 0.2 * Math.sin(3.4 * x + phase);
    const train = [];
    while (train.length < n) {
      const x = 0.04 + r() * 0.92, y = 0.05 + r() * 0.9;
      const m = y - f(x);
      let label = m > 0 ? 1 : 0;
      if (r() < 0.3 * Math.exp(-(m * m) / 0.0144)) label = 1 - label;
      train.push({ x, y, label });
    }
    const held = [];
    while (held.length < heldOut) {
      const x = 0.06 + r() * 0.88, y = 0.07 + r() * 0.86;
      const m = y - f(x);
      if (Math.abs(m) < 0.06) continue;
      held.push({ x, y, label: m > 0 ? 1 : 0 });
    }
    return { train, held, f };
  };

  // Linearly-separable-ish dataset
  ML.genLinear = function (seed, n = 80, noise = 0.22) {
    const r = ML.rand(seed * 1000 + 41);
    const ang = 0.5 + r() * 1.0;
    const nx = Math.cos(ang), ny = Math.sin(ang);
    const pts = [];
    while (pts.length < n) {
      const x = 0.05 + r() * 0.9, y = 0.05 + r() * 0.9;
      const m = (x - 0.5) * nx + (y - 0.5) * ny;
      let label = m > 0 ? 1 : 0;
      if (Math.abs(m) < 0.10 && r() < noise) label = 1 - label;
      pts.push({ x, y, label });
    }
    return pts;
  };

  // Separable dataset with a true margin gap plus exactly `rebels` mislabeled
  // points just past the street (for SVM: soft-margin lesson with a known cost)
  ML.genMargin = function (seed, n = 70, gap = 0.05, rebels = 3) {
    const r = ML.rand(seed * 1000 + 57);
    const ang = 0.5 + r() * 1.0;
    const nx = Math.cos(ang), ny = Math.sin(ang);
    const pts = [];
    while (pts.length < n - rebels) {
      const x = 0.05 + r() * 0.9, y = 0.05 + r() * 0.9;
      const m = (x - 0.5) * nx + (y - 0.5) * ny;
      if (Math.abs(m) < gap) continue;           // keep a real empty street
      pts.push({ x, y, label: m > 0 ? 1 : 0 });
    }
    let planted = 0;
    while (planted < rebels) {
      const x = 0.05 + r() * 0.9, y = 0.05 + r() * 0.9;
      const m = (x - 0.5) * nx + (y - 0.5) * ny;
      if (Math.abs(m) < gap * 1.4 || Math.abs(m) > gap * 4) continue;
      pts.push({ x, y, label: m > 0 ? 0 : 1, rebel: true });  // wrong label on purpose
      planted++;
    }
    return pts;
  };

  // Ring/moon-ish non-linear dataset (for neural nets)
  ML.genRings = function (seed, n = 110) {
    const r = ML.rand(seed * 1000 + 91);
    const pts = [];
    for (let i = 0; i < Math.round(n * 0.45); i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * 0.16;
      pts.push({ x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d, label: 1 });
    }
    while (pts.length < n) {
      const a = r() * 6.283, d = 0.26 + r() * 0.16;
      const x = 0.5 + Math.cos(a) * d, y = 0.5 + Math.sin(a) * d;
      if (x < 0.04 || x > 0.96 || y < 0.05 || y > 0.95) continue;
      pts.push({ x, y, label: 0 });
    }
    return pts;
  };

  // Correlated 2D gaussian cloud (for PCA). tilt: radians, aspect: sigma2/sigma1 in (0,1]
  ML.genCorrelated = function (seed, n, tilt, aspect) {
    const r = ML.rand(seed * 1000 + 63);
    const g = () => { // Box–Muller
      const u = Math.max(1e-9, r()), v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v);
    };
    const s1 = 0.16, s2 = 0.16 * aspect;
    const c = Math.cos(tilt), s = Math.sin(tilt);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = g() * s1, b = g() * s2;
      const x = 0.5 + a * c - b * s, y = 0.5 + a * s + b * c;
      if (x > 0.03 && x < 0.97 && y > 0.03 && y < 0.97) pts.push({ x, y });
    }
    return pts;
  };

  ML.knn = function (data, x, y, k) {
    const arr = data.map(p => ({ d: (p.x - x) ** 2 + (p.y - y) ** 2, p }))
      .sort((a, b) => a.d - b.d).slice(0, k);
    const votes = arr.reduce((s, e) => s + e.p.label, 0);
    return { label: votes * 2 > k ? 1 : 0, nn: arr.map(e => e.p), votes };
  };

  // One step of Lloyd's algorithm
  ML.kmeansStep = function (points, centroids) {
    const assign = points.map(p => {
      let best = 0, bd = Infinity;
      centroids.forEach((c, i) => { const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2; if (d < bd) { bd = d; best = i; } });
      return best;
    });
    const next = centroids.map((c, i) => {
      const members = points.filter((_, idx) => assign[idx] === i);
      if (!members.length) return c;
      return {
        x: members.reduce((s, p) => s + p.x, 0) / members.length,
        y: members.reduce((s, p) => s + p.y, 0) / members.length
      };
    });
    return { assign, centroids: next };
  };
  ML.inertia = function (points, centroids, assign) {
    let s = 0;
    points.forEach((p, i) => { const c = centroids[assign[i]]; s += (p.x - c.x) ** 2 + (p.y - c.y) ** 2; });
    return s; // raw sum of squared distances
  };

  // Greedy axis-aligned decision tree (Gini)
  ML.buildTree = function (points, depth) {
    function gini(pts) {
      if (!pts.length) return 0;
      const p1 = pts.filter(p => p.label === 1).length / pts.length;
      return 1 - p1 * p1 - (1 - p1) * (1 - p1);
    }
    function bestSplit(pts) {
      let best = null;
      ["x", "y"].forEach(axis => {
        const vals = [...new Set(pts.map(p => p[axis]))].sort((a, b) => a - b);
        for (let i = 1; i < vals.length; i++) {
          const t = (vals[i - 1] + vals[i]) / 2;
          const left = pts.filter(p => p[axis] < t), right = pts.filter(p => p[axis] >= t);
          if (!left.length || !right.length) continue;
          const g = (left.length * gini(left) + right.length * gini(right)) / pts.length;
          if (!best || g < best.g) best = { axis, t, g, left, right };
        }
      });
      return best;
    }
    function recurse(pts, d, bounds) {
      if (d >= depth || gini(pts) < 0.02 || pts.length < 3) {
        const p1 = pts.filter(p => p.label === 1).length / (pts.length || 1);
        return { leaf: true, label: p1 >= 0.5 ? 1 : 0, purity: Math.max(p1, 1 - p1), bounds };
      }
      const s = bestSplit(pts);
      if (!s) {
        const p1 = pts.filter(p => p.label === 1).length / (pts.length || 1);
        return { leaf: true, label: p1 >= 0.5 ? 1 : 0, purity: Math.max(p1, 1 - p1), bounds };
      }
      const lb = { ...bounds }, rb = { ...bounds };
      if (s.axis === "x") { lb.x1 = s.t; rb.x0 = s.t; } else { lb.y1 = s.t; rb.y0 = s.t; }
      return {
        leaf: false, axis: s.axis, t: s.t, bounds,
        left: recurse(s.left, d + 1, lb), right: recurse(s.right, d + 1, rb)
      };
    }
    return recurse(points, 0, { x0: 0, x1: 1, y0: 0, y1: 1 });
  };
  ML.treePredict = function (node, x, y) {
    if (node.leaf) return node.label;
    if (node.axis === "x") return x < node.t ? ML.treePredict(node.left, x, y) : ML.treePredict(node.right, x, y);
    return y < node.t ? ML.treePredict(node.left, x, y) : ML.treePredict(node.right, x, y);
  };
  ML.treeLeaves = function (node, out = []) {
    if (node.leaf) out.push(node); else { ML.treeLeaves(node.left, out); ML.treeLeaves(node.right, out); }
    return out;
  };
  ML.treeSplits = function (node, out = []) {
    if (!node.leaf) { out.push(node); ML.treeSplits(node.left, out); ML.treeSplits(node.right, out); }
    return out;
  };

  // Gaussian Naive Bayes
  ML.fitGaussianNB = function (points) {
    return [0, 1].map(label => {
      const pts = points.filter(p => p.label === label);
      const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const vx = Math.max(0.0015, pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) / pts.length);
      const vy = Math.max(0.0015, pts.reduce((s, p) => s + (p.y - my) ** 2, 0) / pts.length);
      return { mx, my, vx, vy, prior: pts.length / points.length };
    });
  };
  ML.nbLogLik = function (c, x, y) {
    const g = (v, m, s2) => -0.5 * Math.log(2 * Math.PI * s2) - ((v - m) ** 2) / (2 * s2);
    return Math.log(c.prior) + g(x, c.mx, c.vx) + g(y, c.my, c.vy);
  };
  ML.nbPosterior = function (classes, x, y) {
    const l0 = ML.nbLogLik(classes[0], x, y), l1 = ML.nbLogLik(classes[1], x, y);
    const m = Math.max(l0, l1);
    const e0 = Math.exp(l0 - m), e1 = Math.exp(l1 - m);
    return e1 / (e0 + e1); // P(class B)
  };

  // Logistic regression
  ML.logregStep = function (points, w, lr) {
    let gx = 0, gy = 0, gb = 0;
    points.forEach(p => {
      const z = w.x * p.x + w.y * p.y + w.b;
      const pred = 1 / (1 + Math.exp(-z));
      const err = pred - p.label;
      gx += err * p.x; gy += err * p.y; gb += err;
    });
    const n = points.length;
    return { x: w.x - lr * gx / n, y: w.y - lr * gy / n, b: w.b - lr * gb / n };
  };
  ML.logregLoss = function (points, w) {
    let s = 0;
    points.forEach(p => {
      const z = w.x * p.x + w.y * p.y + w.b;
      const pr = 1 / (1 + Math.exp(-z));
      s += -(p.label * Math.log(pr + 1e-9) + (1 - p.label) * Math.log(1 - pr + 1e-9));
    });
    return s / points.length;
  };
  ML.linPredict = function (w, x, y) { return (w.x * x + w.y * y + w.b) > 0 ? 1 : 0; };

  // Pegasos-style SVM step (labels {0,1} mapped to {-1,1})
  ML.svmStep = function (points, w, C, t) {
    const lambda = 1 / (C * points.length);
    const lr = 1 / (lambda * (t + 1));
    let gx = 0, gy = 0, gb = 0;
    points.forEach(p => {
      const yl = p.label === 1 ? 1 : -1;
      const margin = yl * (w.x * p.x + w.y * p.y + w.b);
      if (margin < 1) { gx -= yl * p.x; gy -= yl * p.y; gb -= yl; }
    });
    const n = points.length;
    return {
      x: (1 - lr * lambda) * w.x - (lr / n) * gx,
      y: (1 - lr * lambda) * w.y - (lr / n) * gy,
      b: w.b - (lr / n) * gb
    };
  };

  // Tiny 2-4-1 MLP, tanh hidden, sigmoid out
  ML.mlpInit = function (seed) {
    const r = ML.rand(seed * 77 + 5);
    const g = () => (r() - 0.5) * 2.4;
    return {
      w1: [[g(), g()], [g(), g()], [g(), g()], [g(), g()]],
      b1: [g(), g(), g(), g()],
      w2: [g(), g(), g(), g()],
      b2: g()
    };
  };
  ML.mlpForward = function (net, x, y) {
    const h = net.w1.map((w, i) => Math.tanh(w[0] * (x - 0.5) * 4 + w[1] * (y - 0.5) * 4 + net.b1[i]));
    const z = h.reduce((s, hv, i) => s + hv * net.w2[i], net.b2);
    return { h, out: 1 / (1 + Math.exp(-z)) };
  };
  ML.mlpStep = function (net, points, lr) {
    const gw1 = net.w1.map(() => [0, 0]), gb1 = net.b1.map(() => 0);
    const gw2 = net.w2.map(() => 0); let gb2 = 0;
    points.forEach(p => {
      const { h, out } = ML.mlpForward(net, p.x, p.y);
      const dOut = out - p.label;
      net.w2.forEach((w, i) => { gw2[i] += dOut * h[i]; });
      gb2 += dOut;
      h.forEach((hv, i) => {
        const dH = dOut * net.w2[i] * (1 - hv * hv);
        gw1[i][0] += dH * (p.x - 0.5) * 4; gw1[i][1] += dH * (p.y - 0.5) * 4;
        gb1[i] += dH;
      });
    });
    const n = points.length;
    net.w1 = net.w1.map((w, i) => [w[0] - lr * gw1[i][0] / n, w[1] - lr * gw1[i][1] / n]);
    net.b1 = net.b1.map((b, i) => b - lr * gb1[i] / n);
    net.w2 = net.w2.map((w, i) => w - lr * gw2[i] / n);
    net.b2 -= lr * gb2 / n;
    return net;
  };
  ML.mlpLoss = function (net, points) {
    let s = 0;
    points.forEach(p => {
      const { out } = ML.mlpForward(net, p.x, p.y);
      s += -(p.label * Math.log(out + 1e-9) + (1 - p.label) * Math.log(1 - out + 1e-9));
    });
    return s / points.length;
  };

  // PCA (2x2 closed form)
  ML.pca2 = function (points) {
    const n = points.length;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    points.forEach(p => { sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; sxy += (p.x - mx) * (p.y - my); });
    sxx /= n; syy /= n; sxy /= n;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy;
    const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
    let vx = 1, vy = 0;
    if (Math.abs(sxy) > 1e-9) { vx = l1 - syy; vy = sxy; } else if (sxx < syy) { vx = 0; vy = 1; }
    const len = Math.hypot(vx, vy) || 1;
    vx /= len; vy /= len;
    return { mx, my, vx, vy, vx2: -vy, vy2: vx, l1, l2, varExplained: l1 / (l1 + l2 || 1) };
  };

  // ---- Optimization surface: anisotropic bowl (a ravine) ----
  ML.surf = {
    f: (x, y) => 0.5 * (1.0 * x * x + 9.0 * y * y),
    grad: (x, y) => [1.0 * x, 9.0 * y],
    start: [-0.92, 0.42]
  };
  ML.gdStep = function (pos, lr) {
    const g = ML.surf.grad(pos[0], pos[1]);
    return { pos: [pos[0] - lr * g[0], pos[1] - lr * g[1]] };
  };
  ML.momentumStep = function (pos, vel, lr, beta = 0.9) {
    const g = ML.surf.grad(pos[0], pos[1]);
    const v = [beta * vel[0] - lr * g[0], beta * vel[1] - lr * g[1]];
    return { pos: [pos[0] + v[0], pos[1] + v[1]], vel: v };
  };
  ML.adamStep = function (pos, m, v, t, lr, b1 = 0.9, b2 = 0.999, eps = 1e-8) {
    const g = ML.surf.grad(pos[0], pos[1]);
    const nm = [b1 * m[0] + (1 - b1) * g[0], b1 * m[1] + (1 - b1) * g[1]];
    const nv = [b2 * v[0] + (1 - b2) * g[0] * g[0], b2 * v[1] + (1 - b2) * g[1] * g[1]];
    const mh = [nm[0] / (1 - Math.pow(b1, t)), nm[1] / (1 - Math.pow(b1, t))];
    const vh = [nv[0] / (1 - Math.pow(b2, t)), nv[1] / (1 - Math.pow(b2, t))];
    return {
      pos: [pos[0] - lr * mh[0] / (Math.sqrt(vh[0]) + eps), pos[1] - lr * mh[1] / (Math.sqrt(vh[1]) + eps)],
      m: nm, v: nv
    };
  };
  // SGD: noisy gradient
  ML.sgdStep = function (pos, lr, r) {
    const g = ML.surf.grad(pos[0], pos[1]);
    const nx = (r() - 0.5) * 1.6, ny = (r() - 0.5) * 1.6;
    return { pos: [pos[0] - lr * (g[0] + nx), pos[1] - lr * (g[1] + ny)] };
  };

  // Grid-world Q-learning
  ML.makeGrid = function (size = 6) {
    return { size, goal: { x: size - 1, y: 0 }, start: { x: 0, y: size - 1 }, walls: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 4 }] };
  };
  ML.qlearnStep = function (grid, Q, state, epsilon, alpha, gamma, r) {
    const actions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const key = (s) => s.x + "," + s.y;
    if (!Q[key(state)]) Q[key(state)] = [0, 0, 0, 0];
    let a;
    if (r() < epsilon) a = Math.floor(r() * 4);
    else { const qs = Q[key(state)]; a = qs.indexOf(Math.max(...qs)); }
    let nx = state.x + actions[a][0], ny = state.y + actions[a][1];
    nx = Math.max(0, Math.min(grid.size - 1, nx));
    ny = Math.max(0, Math.min(grid.size - 1, ny));
    if (grid.walls.some(w => w.x === nx && w.y === ny)) { nx = state.x; ny = state.y; }
    const isGoal = nx === grid.goal.x && ny === grid.goal.y;
    const reward = isGoal ? 10 : -0.1;
    const nextState = { x: nx, y: ny };
    if (!Q[key(nextState)]) Q[key(nextState)] = [0, 0, 0, 0];
    const maxNext = Math.max(...Q[key(nextState)]);
    Q[key(state)][a] += alpha * (reward + gamma * maxNext - Q[key(state)][a]);
    return { next: isGoal ? { ...grid.start } : nextState, done: isGoal, action: a };
  };

  ML.accuracy = function (points, predictFn) {
    if (!points.length) return 0;
    let ok = 0;
    points.forEach(p => { if (predictFn(p.x, p.y) === p.label) ok++; });
    return ok / points.length;
  };

  window.ML = ML;
})();
