import {
  AvatarSpecies,
  AvatarStyle,
  FACE_OVAL,
  LEFT_EYE,
  LEFT_EYEBROW,
  LIPS_INNER,
  LIPS_OUTER,
  NODE_HIGHLIGHT_INDICES,
  RIGHT_EYE,
  RIGHT_EYEBROW,
  ThemeColor,
} from "@/types/avatar";

export type LandmarkMap = Record<number, { x: number; y: number }>;

export function drawPastelDotGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
  const step = 28;
  for (let x = step; x < w; x += step) {
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkMap,
  indices: number[],
  w: number,
  h: number,
  lineWidth: number,
  close = false
) {
  ctx.beginPath();
  indices.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (!pt) return;
    const x = (1 - pt.x) * w;
    const y = pt.y * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (close) ctx.closePath();
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Auroraテーマ選択時は時間経過で虹色に変化する有効カラーを返す
function resolveEffectiveTheme(theme: ThemeColor, timeMs: number): ThemeColor {
  if (theme.name !== "Aurora") return theme;
  const hue = Math.floor((timeMs * 0.06) % 360);
  return {
    ...theme,
    swatch: `hsl(${hue}, 88%, 74%)`,
    stroke: `hsl(${(hue + 25) % 360}, 78%, 48%)`,
    glow: `hsla(${hue}, 90%, 65%, 0.45)`,
  };
}

export function drawAnimojiAvatar(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkMap,
  w: number,
  h: number,
  rawTheme: ThemeColor,
  style: AvatarStyle,
  currentSpecies: AvatarSpecies,
  evoLevel: number,
  timeMs: number
) {
  ctx.save();
  const t = timeMs * 0.002;
  const currentTheme = resolveEffectiveTheme(rawTheme, timeMs);

  const toPx = (idx: number) => {
    const pt = landmarks[idx] || { x: 0.5, y: 0.5 };
    return { x: (1 - pt.x) * w, y: pt.y * h };
  };

  const center = toPx(168); // 眉間
  const nose = toPx(1); // 鼻先
  const topHead = toPx(10); // 頭頂
  const chin = toPx(152); // 顎

  const screenLeftCheek = toPx(454);
  const screenRightCheek = toPx(234);

  // ---------------------------------------------------
  // A. Human（サイバーパステルワイヤー）
  // ---------------------------------------------------
  if (currentSpecies === "human") {
    if (evoLevel >= 2 || rawTheme.name === "Aurora") {
      const pulse = 1 + Math.sin(t * 2) * 0.04;
      ctx.save();
      ctx.beginPath();
      ctx.arc(center.x, center.y, 115 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = currentTheme.swatch;
      ctx.lineWidth = evoLevel >= 3 || rawTheme.name === "Aurora" ? 3 : 2;
      ctx.setLineDash([8, 10]);
      ctx.lineDashOffset = -timeMs * 0.03;
      ctx.stroke();
      ctx.restore();
    }

    if (style === "aura") {
      ctx.save();
      ctx.strokeStyle = currentTheme.swatch;
      ctx.shadowColor = currentTheme.glow;
      ctx.shadowBlur = 16;
      drawPath(ctx, landmarks, FACE_OVAL, w, h, 7);
      ctx.restore();
    }

    ctx.strokeStyle = currentTheme.stroke;
    ctx.shadowColor = currentTheme.glow;
    ctx.shadowBlur = evoLevel >= 2 ? 12 : 6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    drawPath(ctx, landmarks, FACE_OVAL, w, h, style === "aura" ? 3 : 2.5);
    drawPath(ctx, landmarks, LEFT_EYE, w, h, 2.2);
    drawPath(ctx, landmarks, RIGHT_EYE, w, h, 2.2);
    drawPath(ctx, landmarks, LEFT_EYEBROW, w, h, 2.8);
    drawPath(ctx, landmarks, RIGHT_EYEBROW, w, h, 2.8);
    drawPath(ctx, landmarks, LIPS_OUTER, w, h, 2.2);
    drawPath(ctx, landmarks, LIPS_INNER, w, h, 1.6);

    ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
    ctx.shadowBlur = 0;
    drawPath(ctx, landmarks, [234, 168, 454], w, h, 1.2);
    drawPath(ctx, landmarks, [10, 168, 152], w, h, 1.2);

    if (style === "nodes") {
      ctx.save();
      ctx.fillStyle = currentTheme.swatch;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      for (const idx of NODE_HIGHLIGHT_INDICES) {
        const pt = toPx(idx);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // ---------------------------------------------------
    // B. 2.5D 立体アニ文字ヘッド（ドラゴン・ユニコーン対応）
    // ---------------------------------------------------
    const mat = getAnimojiMaterial(currentSpecies, currentTheme);

    const headCx = (screenLeftCheek.x + screenRightCheek.x + center.x) / 3;
    const headCy = (topHead.y + chin.y) * 0.5;

    const roll = Math.atan2(
      screenRightCheek.y - screenLeftCheek.y,
      screenRightCheek.x - screenLeftCheek.x
    );

    const rawWidth = Math.hypot(
      screenRightCheek.x - screenLeftCheek.x,
      screenRightCheek.y - screenLeftCheek.y
    );
    const rawHeight = Math.hypot(chin.x - topHead.x, chin.y - topHead.y);
    const baseSize = Math.max(105, Math.min(200, Math.max(rawWidth, rawHeight * 0.88)));

    const midCheekX = (screenLeftCheek.x + screenRightCheek.x) / 2;
    const yaw = Math.max(-0.75, Math.min(0.75, (nose.x - midCheekX) / (baseSize * 0.28)));
    const midVertY = (topHead.y + chin.y) / 2;
    const pitch = Math.max(-0.45, Math.min(0.45, (nose.y - midVertY) / (baseSize * 0.35)));

    const leftEyeOpen = Math.abs(toPx(159).y - toPx(145).y) / Math.max(60, rawHeight);
    const rightEyeOpen = Math.abs(toPx(386).y - toPx(374).y) / Math.max(60, rawHeight);
    const mouthOpen = Math.abs(toPx(13).y - toPx(14).y) / Math.max(60, rawHeight);
    const browRaise = ((center.y - toPx(105).y) / Math.max(60, rawHeight) - 0.12) * 18;

    // Lv.2以上 または Aurora選択時：背面オーラリング
    if (evoLevel >= 2 || rawTheme.name === "Aurora") {
      const pulse = 1 + Math.sin(t * 2) * 0.04;
      ctx.save();
      ctx.beginPath();
      ctx.arc(headCx, headCy, baseSize * 0.85 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = currentTheme.swatch;
      ctx.lineWidth = evoLevel >= 3 || rawTheme.name === "Aurora" ? 3.2 : 2;
      ctx.setLineDash([8, 10]);
      ctx.lineDashOffset = -timeMs * 0.03;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(headCx, headCy);
    ctx.rotate(roll);

    const headRx = baseSize * 0.56;
    const headRy = baseSize * 0.54;
    const earOrder = yaw >= 0 ? [1, -1] : [-1, 1];

    // 1. 立体耳 / ドラゴンのツノ（背面レイヤー）
    earOrder.forEach((side) => {
      const perspectiveScale = 1 - side * yaw * 0.16;
      const earOffsetX = side * headRx * 0.68 - yaw * headRx * 0.28;
      const earOffsetY = -headRy * 0.72 - pitch * headRy * 0.18;

      ctx.save();
      ctx.translate(earOffsetX, earOffsetY);
      ctx.rotate(side * 0.28 - yaw * 0.18);
      ctx.scale(perspectiveScale, perspectiveScale);

      ctx.shadowColor = "rgba(15, 23, 42, 0.2)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;

      if (currentSpecies === "dragon") {
        // ドラゴンの立体曲線ツノ＋サイドフィン
        const hornH = baseSize * 0.62;
        const hornW = baseSize * 0.22;
        const hornGrad = ctx.createLinearGradient(0, -hornH, 0, hornH * 0.2);
        hornGrad.addColorStop(0, "#fef08a");
        hornGrad.addColorStop(0.45, "#f59e0b");
        hornGrad.addColorStop(1, "#92400e");

        ctx.fillStyle = hornGrad;
        ctx.beginPath();
        ctx.moveTo(-hornW * 0.5, hornH * 0.18);
        ctx.quadraticCurveTo(-hornW * 0.55, -hornH * 0.45, side * hornW * 0.35, -hornH * 0.92);
        ctx.quadraticCurveTo(hornW * 0.55, -hornH * 0.38, hornW * 0.5, hornH * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // ツノの節ライン
        ctx.strokeStyle = "rgba(120, 53, 15, 0.45)";
        ctx.lineWidth = 2;
        for (let r = 1; r <= 3; r++) {
          const ry = -hornH * 0.18 * r;
          ctx.beginPath();
          ctx.moveTo(-hornW * 0.28, ry);
          ctx.quadraticCurveTo(0, ry + 4, hornW * 0.28, ry);
          ctx.stroke();
        }
      } else if (currentSpecies === "bear" || currentSpecies === "panda") {
        const rOuter = baseSize * 0.21;
        const outerGrad = ctx.createRadialGradient(-rOuter * 0.25, -rOuter * 0.25, 2, 0, 0, rOuter);
        outerGrad.addColorStop(0, mat.earHighlight);
        outerGrad.addColorStop(0.6, mat.earBase);
        outerGrad.addColorStop(1, mat.earShadow);

        ctx.beginPath();
        ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
        ctx.fillStyle = outerGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const rInner = rOuter * 0.55;
        const innerGrad = ctx.createRadialGradient(0, rInner * 0.15, 2, 0, rInner * 0.1, rInner);
        innerGrad.addColorStop(0, mat.earInnerDeep);
        innerGrad.addColorStop(1, mat.earInnerLight);

        ctx.beginPath();
        ctx.arc(0, rOuter * 0.08, rInner, 0, Math.PI * 2);
        ctx.fillStyle = innerGrad;
        ctx.fill();
      } else {
        const earH =
          currentSpecies === "furry"
            ? baseSize * 0.56
            : currentSpecies === "fox" || currentSpecies === "unicorn"
            ? baseSize * 0.5
            : baseSize * 0.44;
        const earW = baseSize * 0.26;

        const earGrad = ctx.createLinearGradient(-earW * 0.4, -earH, earW * 0.4, earH * 0.2);
        earGrad.addColorStop(0, mat.earHighlight);
        earGrad.addColorStop(0.55, mat.earBase);
        earGrad.addColorStop(1, mat.earShadow);

        ctx.beginPath();
        ctx.moveTo(-earW * 0.55, earH * 0.18);
        ctx.quadraticCurveTo(-earW * 0.45, -earH * 0.45, 0, -earH * 0.85);
        ctx.quadraticCurveTo(earW * 0.45, -earH * 0.45, earW * 0.55, earH * 0.18);
        ctx.closePath();
        ctx.fillStyle = earGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const innerGrad = ctx.createLinearGradient(0, -earH * 0.65, 0, earH * 0.12);
        innerGrad.addColorStop(0, mat.earInnerDeep);
        innerGrad.addColorStop(1, mat.earInnerLight);

        ctx.beginPath();
        ctx.moveTo(-earW * 0.3, earH * 0.1);
        ctx.quadraticCurveTo(-earW * 0.2, -earH * 0.35, 0, -earH * 0.65);
        ctx.quadraticCurveTo(earW * 0.2, -earH * 0.35, earW * 0.3, earH * 0.1);
        ctx.closePath();
        ctx.fillStyle = innerGrad;
        ctx.fill();
      }
      ctx.restore();
    });

    // 2. 頬のモフモフ毛束 / ドラゴンヒレ
    const tuftScale =
      currentSpecies === "furry" || currentSpecies === "dragon"
        ? 1.25
        : currentSpecies === "fox" || currentSpecies === "cat" || currentSpecies === "unicorn"
        ? 1.0
        : 0.4;
    [-1, 1].forEach((side) => {
      const cheekX = side * headRx * 0.92 - yaw * headRx * 0.15;
      const cheekY = headRy * 0.18;
      ctx.save();
      ctx.translate(cheekX, cheekY);

      const furGrad = ctx.createLinearGradient(0, -headRy * 0.2, side * headRx * 0.35, headRy * 0.25);
      furGrad.addColorStop(
        0,
        currentSpecies === "fox" || currentSpecies === "furry" || currentSpecies === "cat" || currentSpecies === "unicorn"
          ? "#ffffff"
          : mat.furBase
      );
      furGrad.addColorStop(1, mat.furShadow);

      ctx.fillStyle = furGrad;
      ctx.beginPath();
      ctx.moveTo(-side * 6, -headRy * 0.2);
      ctx.quadraticCurveTo(
        side * headRx * 0.24 * tuftScale,
        -headRy * 0.15,
        side * headRx * 0.32 * tuftScale,
        -headRy * 0.03
      );
      ctx.lineTo(side * headRx * 0.16 * tuftScale, headRy * 0.06);
      ctx.quadraticCurveTo(
        side * headRx * 0.3 * tuftScale,
        headRy * 0.14,
        side * headRx * 0.36 * tuftScale,
        headRy * 0.24
      );
      ctx.quadraticCurveTo(side * headRx * 0.12, headRy * 0.3, -side * 6, headRy * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // 3. 3Dヘッド本体
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.2)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const headGrad = ctx.createRadialGradient(
      -headRx * 0.25 + yaw * headRx * 0.2,
      -headRy * 0.3 + pitch * headRy * 0.2,
      headRx * 0.1,
      yaw * headRx * 0.1,
      0,
      headRx * 1.15
    );
    headGrad.addColorStop(0, mat.furLight);
    headGrad.addColorStop(0.58, mat.furBase);
    headGrad.addColorStop(0.88, mat.furShadow);
    headGrad.addColorStop(1, mat.furRim);

    drawHeadSilhouette(ctx, headRx, headRy);
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.restore();

    // 頭頂の特別な装飾（ユニコーンの一本角 / ドラゴンのトサカ / 通常の毛束）
    if (currentSpecies === "unicorn") {
      ctx.save();
      ctx.translate(-yaw * headRx * 0.15, -headRy * 0.92);
      const uHornH = baseSize * 0.56;
      const uHornW = baseSize * 0.15;

      const uGrad = ctx.createLinearGradient(0, -uHornH, 0, 8);
      uGrad.addColorStop(0, "#fef08a");
      uGrad.addColorStop(0.35, "#f472b6");
      uGrad.addColorStop(0.7, "#a78bfa");
      uGrad.addColorStop(1, "#38bdf8");

      ctx.shadowColor = "rgba(244, 114, 182, 0.55)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = uGrad;
      ctx.beginPath();
      ctx.moveTo(-uHornW, 8);
      ctx.lineTo(0, -uHornH);
      ctx.lineTo(uHornW, 8);
      ctx.closePath();
      ctx.fill();

      // 螺旋のゴールドライン
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.2;
      for (let s = 1; s <= 4; s++) {
        const sy = -uHornH * 0.18 * s;
        const sw = uHornW * (1 - s * 0.18);
        ctx.beginPath();
        ctx.moveTo(-sw, sy + 4);
        ctx.lineTo(sw, sy - 4);
        ctx.stroke();
      }
      ctx.restore();
    } else if (currentSpecies === "dragon") {
      // 額の輝くダイヤ宝玉
      const gemX = yaw * headRx * 0.42;
      const gemY = -headRy * 0.48 + pitch * headRy * 0.25;
      ctx.save();
      ctx.fillStyle = "#fde047";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(gemX, gemY - headRy * 0.18);
      ctx.lineTo(gemX + headRx * 0.1, gemY);
      ctx.lineTo(gemX, gemY + headRy * 0.18);
      ctx.lineTo(gemX - headRx * 0.1, gemY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(-yaw * headRx * 0.15, -headRy * 0.96);
      ctx.fillStyle = mat.furLight;
      ctx.beginPath();
      ctx.moveTo(-headRx * 0.14, 6);
      ctx.quadraticCurveTo(-headRx * 0.06, -headRy * 0.2, headRx * 0.05, -headRy * 0.24);
      ctx.quadraticCurveTo(0, -headRy * 0.08, headRx * 0.13, -headRy * 0.13);
      ctx.quadraticCurveTo(headRx * 0.08, 0, headRx * 0.15, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. ヘッド内部クリップ（ツートンファー＆額模様）
    ctx.save();
    drawHeadSilhouette(ctx, headRx, headRy);
    ctx.clip();

    if (
      currentSpecies === "fox" ||
      currentSpecies === "furry" ||
      currentSpecies === "cat" ||
      currentSpecies === "unicorn"
    ) {
      const faceCenterShiftX = yaw * headRx * 0.35;
      const faceCenterShiftY = pitch * headRy * 0.3;
      const whiteFurGrad = ctx.createRadialGradient(
        faceCenterShiftX,
        headRy * 0.32 + faceCenterShiftY,
        headRx * 0.08,
        faceCenterShiftX,
        headRy * 0.42 + faceCenterShiftY,
        headRx * 0.95
      );
      whiteFurGrad.addColorStop(0, "#ffffff");
      whiteFurGrad.addColorStop(0.72, "rgba(255, 255, 255, 0.94)");
      whiteFurGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = whiteFurGrad;
      ctx.beginPath();
      ctx.ellipse(
        faceCenterShiftX,
        headRy * 0.44 + faceCenterShiftY,
        headRx * 0.96,
        headRy * 0.58,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    if (currentSpecies === "furry") {
      const bx = yaw * headRx * 0.42;
      const by = -headRy * 0.48 + pitch * headRy * 0.25;
      const blazeGrad = ctx.createLinearGradient(bx, by - headRy * 0.22, bx, by + headRy * 0.16);
      blazeGrad.addColorStop(0, mat.accentLight);
      blazeGrad.addColorStop(1, mat.accentDark);
      ctx.fillStyle = blazeGrad;
      ctx.beginPath();
      ctx.moveTo(bx, by - headRy * 0.22);
      ctx.lineTo(bx + headRx * 0.11, by - headRy * 0.03);
      ctx.lineTo(bx, by + headRy * 0.14);
      ctx.lineTo(bx - headRx * 0.11, by - headRy * 0.03);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 5. 顔パーツ配置
    const faceShiftX = yaw * headRx * 0.46;
    const faceShiftY = pitch * headRy * 0.38;

    if (currentSpecies === "panda") {
      [-1, 1].forEach((side) => {
        const persp = 1 - side * yaw * 0.22;
        const ex = faceShiftX + side * headRx * 0.38 * (1 - Math.abs(yaw) * 0.18);
        const ey = faceShiftY - headRy * 0.08;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(side * 0.3);
        ctx.scale(persp, 1);

        const patchGrad = ctx.createRadialGradient(0, -4, 3, 0, 0, headRx * 0.26);
        patchGrad.addColorStop(0, "#334155");
        patchGrad.addColorStop(0.8, "#1e293b");
        patchGrad.addColorStop(1, "rgba(15, 23, 42, 0.88)");

        ctx.fillStyle = patchGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, headRx * 0.25, headRy * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 6. うるうる3Dアイ ＆ 眉毛
    [-1, 1].forEach((side) => {
      const persp = Math.max(0.55, 1 - side * yaw * 0.25);
      const ex = faceShiftX + side * headRx * 0.38 * (1 - Math.abs(yaw) * 0.2);
      const ey = faceShiftY - headRy * 0.1;
      const isOpen = (side === -1 ? rightEyeOpen : leftEyeOpen) >= 0.026;

      ctx.save();
      ctx.translate(ex, ey - headRy * 0.24 - browRaise);
      ctx.rotate(side * -0.08);
      ctx.scale(persp, 1);
      ctx.strokeStyle = mat.browColor;
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-headRx * 0.14, 2);
      ctx.quadraticCurveTo(0, -4, headRx * 0.14, 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(persp, 1);

      const eyeRx = headRx * 0.165;
      const eyeRy = headRy * 0.16;

      if (!isOpen) {
        ctx.strokeStyle = currentSpecies === "panda" ? "#f8fafc" : "#1e293b";
        ctx.lineWidth = 3.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, eyeRy * 0.3, eyeRx * 0.85, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(15, 23, 42, 0.16)";
        ctx.beginPath();
        ctx.ellipse(0, 2, eyeRx * 1.08, eyeRy * 1.08, 0, 0, Math.PI * 2);
        ctx.fill();

        const scleraGrad = ctx.createRadialGradient(-eyeRx * 0.2, -eyeRy * 0.2, 2, 0, 0, eyeRx);
        scleraGrad.addColorStop(0, "#ffffff");
        scleraGrad.addColorStop(0.75, "#f1f5f9");
        scleraGrad.addColorStop(1, "#cbd5e1");

        ctx.fillStyle = scleraGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeRx, eyeRy, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeRx, eyeRy, 0, 0, Math.PI * 2);
        ctx.clip();

        const irisR = eyeRy * 0.78;
        const irisX = yaw * eyeRx * 0.2;
        const irisGrad = ctx.createRadialGradient(irisX, eyeRy * 0.15, 2, irisX, 0, irisR);
        irisGrad.addColorStop(0, mat.irisLight);
        irisGrad.addColorStop(0.65, mat.irisBase);
        irisGrad.addColorStop(1, mat.irisDark);

        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(irisX, 0, irisR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        if (currentSpecies === "cat" || currentSpecies === "fox" || currentSpecies === "dragon") {
          ctx.ellipse(irisX, 0, irisR * 0.32, irisR * 0.64, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(irisX, 0, irisR * 0.48, 0, Math.PI * 2);
        }
        ctx.fill();

        const lidShadow = ctx.createLinearGradient(0, -eyeRy, 0, 0);
        lidShadow.addColorStop(0, "rgba(15, 23, 42, 0.36)");
        lidShadow.addColorStop(1, "rgba(15, 23, 42, 0)");
        ctx.fillStyle = lidShadow;
        ctx.fillRect(-eyeRx, -eyeRy, eyeRx * 2, eyeRy);

        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.ellipse(
          irisX - irisR * 0.3,
          -irisR * 0.3,
          irisR * 0.28,
          irisR * 0.22,
          -0.4,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.beginPath();
        ctx.arc(irisX + irisR * 0.3, irisR * 0.3, irisR * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, eyeRx, eyeRy, 0, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 7. ぷっくり3Dマズル ＋ 鼻 ＋ 口
    const muzzleX = yaw * headRx * 0.62;
    const muzzleY = headRy * 0.26 + pitch * headRy * 0.45;
    const muzzleW =
      currentSpecies === "bear" || currentSpecies === "panda" ? headRx * 0.42 : headRx * 0.36;
    const muzzleH = headRy * 0.32;

    ctx.save();
    ctx.translate(muzzleX, muzzleY);

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    const muzzleGrad = ctx.createRadialGradient(-muzzleW * 0.2, -muzzleH * 0.25, 2, 0, 0, muzzleW * 1.08);
    muzzleGrad.addColorStop(0, "#ffffff");
    muzzleGrad.addColorStop(0.68, mat.muzzleBase);
    muzzleGrad.addColorStop(1, mat.muzzleShadow);

    ctx.fillStyle = muzzleGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, muzzleW, muzzleH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const noseCenterY = -muzzleH * 0.34;
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.22)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const noseGrad = ctx.createRadialGradient(
      -muzzleW * 0.1,
      noseCenterY - muzzleH * 0.1,
      1,
      0,
      noseCenterY,
      muzzleW * 0.38
    );
    noseGrad.addColorStop(0, mat.noseHighlight);
    noseGrad.addColorStop(0.55, mat.noseBase);
    noseGrad.addColorStop(1, "#090d16");

    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    if (currentSpecies === "bear" || currentSpecies === "panda") {
      ctx.ellipse(0, noseCenterY, muzzleW * 0.34, muzzleH * 0.24, 0, 0, Math.PI * 2);
    } else {
      const nw = muzzleW * 0.32;
      const nh = muzzleH * 0.24;
      ctx.moveTo(-nw, noseCenterY - nh * 0.55);
      ctx.quadraticCurveTo(0, noseCenterY - nh * 0.95, nw, noseCenterY - nh * 0.55);
      ctx.quadraticCurveTo(nw * 0.75, noseCenterY + nh * 0.35, 0, noseCenterY + nh * 0.78);
      ctx.quadraticCurveTo(-nw * 0.75, noseCenterY + nh * 0.35, -nw, noseCenterY - nh * 0.55);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.ellipse(
      -muzzleW * 0.09,
      noseCenterY - muzzleH * 0.08,
      muzzleW * 0.11,
      muzzleH * 0.055,
      -0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    const philtrumTopY = noseCenterY + muzzleH * 0.2;
    const mouthCenterY = muzzleH * 0.26;

    if (mouthOpen > 0.045) {
      const openH = Math.min(muzzleH * 0.52, mouthOpen * baseSize * 0.75);
      const openW = muzzleW * 0.52;

      ctx.save();
      const mouthGrad = ctx.createRadialGradient(0, mouthCenterY + openH * 0.3, 2, 0, mouthCenterY + openH * 0.2, openW);
      mouthGrad.addColorStop(0, "#7f1d1d");
      mouthGrad.addColorStop(1, "#3b0712");

      ctx.fillStyle = mouthGrad;
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + openH * 0.2, openW, openH * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + openH * 0.2, openW, openH * 0.75, 0, 0, Math.PI * 2);
      ctx.clip();

      const tongueGrad = ctx.createRadialGradient(0, mouthCenterY + openH * 0.45, 2, 0, mouthCenterY + openH * 0.6, openW * 0.8);
      tongueGrad.addColorStop(0, "#fda4af");
      tongueGrad.addColorStop(1, "#e11d48");
      ctx.fillStyle = tongueGrad;
      ctx.beginPath();
      ctx.ellipse(0, mouthCenterY + openH * 0.62, openW * 0.72, openH * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (
        currentSpecies === "furry" ||
        currentSpecies === "cat" ||
        currentSpecies === "fox" ||
        currentSpecies === "dragon"
      ) {
        ctx.fillStyle = "#ffffff";
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(side * openW * 0.4, mouthCenterY - openH * 0.28);
          ctx.lineTo(side * openW * 0.56, mouthCenterY + openH * 0.14);
          ctx.lineTo(side * openW * 0.7, mouthCenterY - openH * 0.22);
          ctx.closePath();
          ctx.fill();
        });
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(0, philtrumTopY);
      ctx.lineTo(0, mouthCenterY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, mouthCenterY);
      ctx.quadraticCurveTo(-muzzleW * 0.22, mouthCenterY + muzzleH * 0.26, -muzzleW * 0.42, mouthCenterY + muzzleH * 0.02);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, mouthCenterY);
      ctx.quadraticCurveTo(muzzleW * 0.22, mouthCenterY + muzzleH * 0.26, muzzleW * 0.42, mouthCenterY + muzzleH * 0.02);
      ctx.stroke();
    }

    if (currentSpecies === "cat" || currentSpecies === "fox") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.shadowColor = "rgba(15, 23, 42, 0.15)";
      ctx.shadowBlur = 3;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      [-1, 1].forEach((side) => {
        [-1, 1].forEach((row) => {
          ctx.beginPath();
          ctx.moveTo(side * muzzleW * 0.8, row * 7);
          ctx.quadraticCurveTo(
            side * muzzleW * 1.35,
            -3 + row * 9,
            side * muzzleW * 1.85,
            4 + row * 14
          );
          ctx.stroke();
        });
      });
    }

    ctx.restore();
    ctx.restore();
  }

  // Lv.3以上 または Aurora選択時：スパークル粒子
  if (evoLevel >= 3 || rawTheme.name === "Aurora") {
    ctx.save();
    ctx.fillStyle = currentTheme.swatch;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    const particleCount = evoLevel >= 4 ? 10 : 7;
    for (let i = 0; i < particleCount; i++) {
      const angle = t * 0.9 + (i * Math.PI * 2) / particleCount;
      const radius = 115 + Math.sin(t * 2 + i) * 14;
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * (radius * 0.85);
      const size = 3.8 + Math.sin(t * 3 + i) * 1.2;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.5, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Lv.4：立体ゴールドクラウン
  if (evoLevel >= 4) {
    ctx.save();
    const crownY = topHead.y - 42 + Math.sin(t * 2.5) * 4;
    const crownGrad = ctx.createLinearGradient(topHead.x - 24, crownY - 12, topHead.x + 24, crownY + 10);
    crownGrad.addColorStop(0, "#fef08a");
    crownGrad.addColorStop(0.5, "#facc15");
    crownGrad.addColorStop(1, "#eab308");

    ctx.fillStyle = crownGrad;
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "rgba(234, 179, 8, 0.45)";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(topHead.x - 24, crownY + 10);
    ctx.lineTo(topHead.x - 16, crownY - 6);
    ctx.lineTo(topHead.x, crownY + 4);
    ctx.lineTo(topHead.x, crownY - 12);
    ctx.lineTo(topHead.x, crownY + 4);
    ctx.lineTo(topHead.x + 16, crownY - 6);
    ctx.lineTo(topHead.x + 24, crownY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawHeadSilhouette(ctx: CanvasRenderingContext2D, headRx: number, headRy: number) {
  ctx.beginPath();
  ctx.moveTo(0, -headRy);
  ctx.bezierCurveTo(headRx * 0.72, -headRy, headRx * 1.04, -headRy * 0.42, headRx * 1.02, headRy * 0.12);
  ctx.bezierCurveTo(headRx * 1.0, headRy * 0.68, headRx * 0.55, headRy * 0.98, 0, headRy * 0.98);
  ctx.bezierCurveTo(-headRx * 0.55, headRy * 0.98, -headRx * 1.0, headRy * 0.68, -headRx * 1.02, headRy * 0.12);
  ctx.bezierCurveTo(-headRx * 1.04, -headRy * 0.42, -headRx * 0.72, -headRy, 0, -headRy);
  ctx.closePath();
}

function getAnimojiMaterial(sp: AvatarSpecies, currentTheme: ThemeColor) {
  switch (sp) {
    case "dragon":
      return {
        furLight: "#6ee7b7",
        furBase: "#10b981",
        furShadow: "#047857",
        furRim: "#064e3b",
        earHighlight: "#fde047",
        earBase: "#f59e0b",
        earShadow: "#92400e",
        earInnerDeep: "#047857",
        earInnerLight: "#a7f3d0",
        muzzleBase: "#ecfdf5",
        muzzleShadow: "#a7f3d0",
        noseHighlight: "#6ee7b7",
        noseBase: "#065f46",
        irisLight: "#fef08a",
        irisBase: "#eab308",
        irisDark: "#713f12",
        browColor: "#064e3b",
        accentLight: "#fde047",
        accentDark: "#d97706",
      };
    case "unicorn":
      return {
        furLight: "#ffffff",
        furBase: "#f5f3ff",
        furShadow: "#ddd6fe",
        furRim: "#c4b5fd",
        earHighlight: "#fbcfe8",
        earBase: "#f472b6",
        earShadow: "#db2777",
        earInnerDeep: "#c084fc",
        earInnerLight: "#fae8ff",
        muzzleBase: "#ffffff",
        muzzleShadow: "#fce7f3",
        noseHighlight: "#fbcfe8",
        noseBase: "#f472b6",
        irisLight: "#e0f2fe",
        irisBase: "#8b5cf6",
        irisDark: "#4c1d95",
        browColor: "#a855f7",
        accentLight: "#f9a8d4",
        accentDark: "#c084fc",
      };
    case "fox":
      return {
        furLight: "#fed7aa",
        furBase: "#f97316",
        furShadow: "#c2410c",
        furRim: "#9a3412",
        earHighlight: "#fb923c",
        earBase: "#ea580c",
        earShadow: "#7c2d12",
        earInnerDeep: "#9a3412",
        earInnerLight: "#ffedd5",
        muzzleBase: "#fff7ed",
        muzzleShadow: "#fed7aa",
        noseHighlight: "#64748b",
        noseBase: "#1e293b",
        irisLight: "#fde047",
        irisBase: "#d97706",
        irisDark: "#451a03",
        browColor: "#7c2d12",
        accentLight: "#fdba74",
        accentDark: "#ea580c",
      };
    case "bear":
      return {
        furLight: "#e7c697",
        furBase: "#b47b44",
        furShadow: "#78350f",
        furRim: "#451a03",
        earHighlight: "#c68b53",
        earBase: "#925826",
        earShadow: "#451a03",
        earInnerDeep: "#78350f",
        earInnerLight: "#fde68a",
        muzzleBase: "#fef3c7",
        muzzleShadow: "#fde68a",
        noseHighlight: "#64748b",
        noseBase: "#1e293b",
        irisLight: "#fbbf24",
        irisBase: "#78350f",
        irisDark: "#271003",
        browColor: "#451a03",
        accentLight: "#fcd34d",
        accentDark: "#b45309",
      };
    case "panda":
      return {
        furLight: "#ffffff",
        furBase: "#f8fafc",
        furShadow: "#cbd5e1",
        furRim: "#94a3b8",
        earHighlight: "#475569",
        earBase: "#1e293b",
        earShadow: "#090d16",
        earInnerDeep: "#0f172a",
        earInnerLight: "#475569",
        muzzleBase: "#ffffff",
        muzzleShadow: "#e2e8f0",
        noseHighlight: "#64748b",
        noseBase: "#0f172a",
        irisLight: "#93c5fd",
        irisBase: "#2563eb",
        irisDark: "#172554",
        browColor: "#334155",
        accentLight: "#475569",
        accentDark: "#0f172a",
      };
    case "cat":
      return {
        furLight: "#f1f5f9",
        furBase: "#94a3b8",
        furShadow: "#475569",
        furRim: "#334155",
        earHighlight: "#cbd5e1",
        earBase: "#64748b",
        earShadow: "#334155",
        earInnerDeep: "#f472b6",
        earInnerLight: "#fce7f3",
        muzzleBase: "#ffffff",
        muzzleShadow: "#e2e8f0",
        noseHighlight: "#fbcfe8",
        noseBase: "#ec4899",
        irisLight: "#ffffff",
        irisBase: currentTheme.swatch,
        irisDark: currentTheme.stroke,
        browColor: "#334155",
        accentLight: "#f9a8d4",
        accentDark: "#db2777",
      };
    case "furry":
    default:
      return {
        furLight: "#f8fafc",
        furBase: "#cbd5e1",
        furShadow: "#64748b",
        furRim: "#334155",
        earHighlight: "#94a3b8",
        earBase: "#475569",
        earShadow: "#1e293b",
        earInnerDeep: currentTheme.stroke,
        earInnerLight: currentTheme.swatch,
        muzzleBase: "#ffffff",
        muzzleShadow: "#cbd5e1",
        noseHighlight: "#64748b",
        noseBase: "#0f172a",
        irisLight: "#ffffff",
        irisBase: currentTheme.swatch,
        irisDark: currentTheme.stroke,
        browColor: "#1e293b",
        accentLight: currentTheme.swatch,
        accentDark: currentTheme.stroke,
      };
  }
}