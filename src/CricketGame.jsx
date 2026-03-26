import { useState, useEffect, useRef, useCallback } from "react";

// ── Probability tables ──────────────────────────────────────────────────────
const PROBABILITIES = {
  aggressive: [
    { outcome: "Wicket", prob: 0.40, color: "#e53e3e", label: "W" },
    { outcome: "0",      prob: 0.10, color: "#718096", label: "0" },
    { outcome: "1",      prob: 0.10, color: "#38a169", label: "1" },
    { outcome: "2",      prob: 0.10, color: "#3182ce", label: "2" },
    { outcome: "3",      prob: 0.05, color: "#805ad5", label: "3" },
    { outcome: "4",      prob: 0.10, color: "#d69e2e", label: "4" },
    { outcome: "6",      prob: 0.15, color: "#e91e8c", label: "6" },
  ],
  defensive: [
    { outcome: "Wicket", prob: 0.15, color: "#e53e3e", label: "W" },
    { outcome: "0",      prob: 0.30, color: "#718096", label: "0" },
    { outcome: "1",      prob: 0.25, color: "#38a169", label: "1" },
    { outcome: "2",      prob: 0.15, color: "#3182ce", label: "2" },
    { outcome: "3",      prob: 0.05, color: "#805ad5", label: "3" },
    { outcome: "4",      prob: 0.07, color: "#d69e2e", label: "4" },
    { outcome: "6",      prob: 0.03, color: "#e91e8c", label: "6" },
  ],
};

// ── Commentary ──────────────────────────────────────────────────────────────
const COMMENTARY = {
  Wicket: ["Oh no! Timber! The stumps are shattered!","Out! What a delivery, caught plumb!","Walking back… that's a big blow!"],
  "0":    ["Dot ball. Tight line from the bowler.","Defended well, no run.","Played carefully — but no run."],
  "1":    ["Nudged away for a single.","Quick single, good running!","One and away!"],
  "2":    ["Driven for two! Good placement.","Two runs, nice timing.","They run two — excellent cricket!"],
  "3":    ["Three! Great running between the wickets!","Superb shot, three runs!","Pushed to the gap — three!"],
  "4":    ["FOUR! Crashing through the covers!","BOUNDARY! Thunderous drive!","FOUR runs — what a shot!"],
  "6":    ["SIX! That's gone into the stands!","MAXIMUM! What a clean strike!","OUT OF THE PARK! Six runs!"],
};

const TOTAL_BALLS = 12;
const MAX_WICKETS = 2;
const SLIDER_SPEED = 0.008; // per frame

// ── Canvas Cricket Field ─────────────────────────────────────────────────────
function CricketField({ ballPos, batswingProgress, bowlingPhase, lastOutcome }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    sky.addColorStop(0, "#87CEEB");
    sky.addColorStop(1, "#c8e8f5");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.45);

    // Stands background
    ctx.fillStyle = "#5a3e2b";
    ctx.fillRect(0, H * 0.15, W, H * 0.18);

    // Crowd dots
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = ["#e74c3c","#3498db","#2ecc71","#f1c40f","#9b59b6","#e67e22"][i % 6];
      ctx.beginPath();
      ctx.arc(20 + i * (W / 60), H * 0.18 + 10 + (i % 3) * 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outfield
    const outfield = ctx.createLinearGradient(0, H * 0.33, 0, H);
    outfield.addColorStop(0, "#4caf50");
    outfield.addColorStop(0.5, "#388e3c");
    outfield.addColorStop(1, "#2e7d32");
    ctx.fillStyle = outfield;
    ctx.fillRect(0, H * 0.33, W, H * 0.67);

    // Pitch strip
    ctx.fillStyle = "#c8a96e";
    ctx.fillRect(W * 0.4, H * 0.38, W * 0.2, H * 0.5);

    // Crease lines
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W * 0.38, H * 0.78); ctx.lineTo(W * 0.62, H * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.38, H * 0.50); ctx.lineTo(W * 0.62, H * 0.50); ctx.stroke();

    // Stumps
    const stumpX = W * 0.5;
    const stumpY = H * 0.82;
    ctx.strokeStyle = "#f5deb3";
    ctx.lineWidth = 3;
    for (let s = -1; s <= 1; s++) {
      ctx.beginPath();
      ctx.moveTo(stumpX + s * 6, stumpY);
      ctx.lineTo(stumpX + s * 6, stumpY - 30);
      ctx.stroke();
    }
    // bails
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(stumpX - 10, stumpY - 30); ctx.lineTo(stumpX + 10, stumpY - 30); ctx.stroke();

    // Batsman (stick figure)
    const bx = W * 0.46, by = H * 0.78;
    ctx.strokeStyle = "#1a237e";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#1a237e";
    // body
    ctx.beginPath(); ctx.moveTo(bx, by - 35); ctx.lineTo(bx, by - 15); ctx.stroke();
    // head
    ctx.beginPath(); ctx.arc(bx, by - 40, 6, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.beginPath(); ctx.moveTo(bx, by - 15); ctx.lineTo(bx - 8, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by - 15); ctx.lineTo(bx + 8, by); ctx.stroke();
    // bat swing
    const swingAngle = batswingProgress * (Math.PI / 2);
    ctx.save();
    ctx.translate(bx, by - 20);
    ctx.rotate(-swingAngle);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 10); ctx.stroke();
    ctx.restore();
    // arms
    ctx.beginPath(); ctx.moveTo(bx, by - 28); ctx.lineTo(bx + 14, by - 18); ctx.stroke();

    // Ball
    if (ballPos) {
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.arc(ballPos.x * W, ballPos.y * H, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc0000";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // seam
      ctx.strokeStyle = "#fff8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ballPos.x * W, ballPos.y * H, 5, -0.5, 0.5);
      ctx.stroke();
    }

    // Result flash
    if (lastOutcome) {
      const isBig = lastOutcome === "4" || lastOutcome === "6";
      const isWicket = lastOutcome === "Wicket";
      ctx.font = `bold ${isBig ? 40 : 28}px 'Courier New'`;
      ctx.fillStyle = isWicket ? "#ff3333" : isBig ? "#ffd700" : "#00ff88";
      ctx.textAlign = "center";
      ctx.fillText(
        isWicket ? "OUT!" : lastOutcome === "0" ? "dot" : `+${lastOutcome}`,
        W / 2, H * 0.42
      );
    }

  }, [ballPos, batswingProgress, lastOutcome]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={320}
      style={{ width: "100%", borderRadius: "12px", display: "block" }}
    />
  );
}

// ── Power Bar ────────────────────────────────────────────────────────────────
function PowerBar({ probs, sliderPos, onShot, disabled }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const barY = 30, barH = 36, barX = 10, barW = W - 20;

    // Segments
    let cx = barX;
    probs.forEach(seg => {
      const sw = seg.prob * barW;
      ctx.fillStyle = seg.color;
      ctx.fillRect(cx, barY, sw, barH);
      // Label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      if (sw > 18) ctx.fillText(seg.label, cx + sw / 2, barY + 22);
      cx += sw;
    });

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    // Tick marks
    ctx.fillStyle = "#ccc";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    let tx = barX;
    probs.forEach(seg => {
      const sw = seg.prob * barW;
      ctx.fillStyle = "#fff8";
      ctx.fillRect(tx, barY + barH, 1, 5);
      ctx.fillStyle = "#ddd";
      if (seg.prob >= 0.08) ctx.fillText(seg.prob.toFixed(2), tx + sw / 2, barY + barH + 14);
      tx += sw;
    });

    // Slider
    const sx = barX + sliderPos * barW;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(sx - 6, barY - 10);
    ctx.lineTo(sx + 6, barY - 10);
    ctx.lineTo(sx, barY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.fillRect(sx - 2, barY, 4, barH);

  }, [probs, sliderPos]);

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={540}
        height={68}
        style={{ width: "100%", cursor: disabled ? "not-allowed" : "pointer", display: "block" }}
        onClick={disabled ? undefined : onShot}
      />
      {!disabled && (
        <div style={{
          textAlign: "center",
          fontSize: 11,
          color: "#aaa",
          marginTop: 2,
          fontFamily: "monospace"
        }}>
          CLICK to play shot
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function CricketApp() {
  const [style, setStyle] = useState("aggressive");
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(TOTAL_BALLS);
  const [sliderPos, setSliderPos] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | bowling | batting | result | gameover
  const [ballPos, setBallPos] = useState(null);
  const [batswing, setBatswing] = useState(0);
  const [commentary, setCommentary] = useState("Welcome! Select batting style and click 'Bowl' to start.");
  const [lastOutcome, setLastOutcome] = useState(null);
  const [flashOutcome, setFlashOutcome] = useState(null);
  const [history, setHistory] = useState([]);

  const animRef = useRef(null);
  const sliderDir = useRef(1);
  const sliderRunning = useRef(false);
  const bowlProgress = useRef(0);
  const batProgress = useRef(0);
  const sliderVal = useRef(0);

  // Slider animation
  useEffect(() => {
    if (phase !== "bowling") return;
    sliderRunning.current = true;
    const tick = () => {
      if (!sliderRunning.current) return;
      sliderVal.current += sliderDir.current * SLIDER_SPEED;
      if (sliderVal.current >= 1) { sliderVal.current = 1; sliderDir.current = -1; }
      if (sliderVal.current <= 0) { sliderVal.current = 0; sliderDir.current = 1; }
      setSliderPos(sliderVal.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { sliderRunning.current = false; cancelAnimationFrame(animRef.current); };
  }, [phase]);

  // Bowling animation (ball travels from bowler end to batsman)
  const startBowl = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("bowling");
    setLastOutcome(null);
    setFlashOutcome(null);
    bowlProgress.current = 0;

    const animate = () => {
      bowlProgress.current += 0.025;
      const t = bowlProgress.current;
      // Ball travels from top of pitch to batsman area
      setBallPos({ x: 0.5 + (Math.sin(t * 0.5) * 0.01), y: 0.42 + t * 0.36 });
      if (t < 1) requestAnimationFrame(animate);
      else {
        setBallPos({ x: 0.5, y: 0.78 });
      }
    };
    requestAnimationFrame(animate);
  }, [phase]);

  // Play shot — resolve outcome from slider
  const playShot = useCallback(() => {
    if (phase !== "bowling") return;
    sliderRunning.current = false;
    cancelAnimationFrame(animRef.current);
    setPhase("batting");

    const pos = sliderVal.current;
    const probs = PROBABILITIES[style];
    let cumulative = 0;
    let result = probs[probs.length - 1];
    for (const seg of probs) {
      cumulative += seg.prob;
      if (pos <= cumulative) { result = seg; break; }
    }

    // Bat swing animation
    batProgress.current = 0;
    const swingAnim = () => {
      batProgress.current += 0.08;
      setBatswing(Math.min(batProgress.current, 1));
      if (batProgress.current < 1) requestAnimationFrame(swingAnim);
      else {
        // Resolve result
        setTimeout(() => {
          const outcome = result.outcome;
          const runs_scored = outcome === "Wicket" ? 0 : parseInt(outcome);
          const comm = COMMENTARY[outcome][Math.floor(Math.random() * 3)];

          setRuns(r => r + runs_scored);
          setWickets(w => outcome === "Wicket" ? w + 1 : w);
          setBallsLeft(b => b - 1);
          setCommentary(comm);
          setLastOutcome(outcome);
          setFlashOutcome(outcome);
          setHistory(h => [{ ball: TOTAL_BALLS - ballsLeft + 1, outcome, style }, ...h.slice(0, 11)]);

          // Check game over
          const newWickets = wickets + (outcome === "Wicket" ? 1 : 0);
          const newBalls = ballsLeft - 1;
          if (newWickets >= MAX_WICKETS || newBalls <= 0) {
            setTimeout(() => setPhase("gameover"), 1200);
          } else {
            setTimeout(() => {
              setPhase("idle");
              setBatswing(0);
              setBallPos(null);
              setFlashOutcome(null);
            }, 1500);
          }
        }, 300);
      }
    };
    requestAnimationFrame(swingAnim);
  }, [phase, style, wickets, ballsLeft]);

  const restart = () => {
    setRuns(0); setWickets(0); setBallsLeft(TOTAL_BALLS);
    setStyle("aggressive"); setPhase("idle"); setBallPos(null);
    setBatswing(0); setSliderPos(0); sliderVal.current = 0;
    setCommentary("Game restarted! Select style and click Bowl."); setLastOutcome(null);
    setFlashOutcome(null); setHistory([]);
  };

  const probs = PROBABILITIES[style];
  const oversRemaining = `${Math.floor(ballsLeft / 6)}.${ballsLeft % 6}`;
  const ballsPlayed = TOTAL_BALLS - ballsLeft;
  const oversDone = `${Math.floor(ballsPlayed / 6)}.${ballsPlayed % 6}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1f3c 100%)",
      fontFamily: "'Courier New', monospace",
      color: "#e8e8e8",
      padding: "16px",
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{
          fontSize: 22, fontWeight: "bold", letterSpacing: 4,
          color: "#ffd700", textShadow: "0 0 20px #ffd70066"
        }}>🏏 CRICKET BLITZ</div>
        <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 3 }}>CS-4032 WEB PROGRAMMING</div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Scoreboard */}
        <div style={{
          background: "#0d1f3c",
          border: "2px solid #ffd700",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8
        }}>
          {[
            { label: "RUNS", val: runs, col: "#ffd700" },
            { label: "WICKETS", val: `${wickets}/${MAX_WICKETS}`, col: wickets >= MAX_WICKETS ? "#e53e3e" : "#ff8c00" },
            { label: "OVERS", val: oversDone, col: "#4fc3f7" },
            { label: "BALLS LEFT", val: ballsLeft, col: ballsLeft <= 3 ? "#e53e3e" : "#88ff88" },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#888", letterSpacing: 1 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: "bold", color: item.col, lineHeight: 1.1 }}>{item.val}</div>
            </div>
          ))}
        </div>

        {/* Cricket Field Canvas */}
        <div style={{
          border: "2px solid #2a4a7a",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 10,
          background: "#1a3a5c"
        }}>
          <CricketField
            ballPos={ballPos}
            batswingProgress={batswing}
            bowlingPhase={phase === "bowling"}
            lastOutcome={flashOutcome}
          />
        </div>

        {/* Commentary */}
        <div style={{
          background: "#0d1a2e",
          border: "1px solid #2a4a7a",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 10,
          minHeight: 36,
          fontSize: 12,
          color: "#90caf9",
          fontStyle: "italic"
        }}>
          📢 {commentary}
        </div>

        {/* Batting Style Selection */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {["aggressive", "defensive"].map(s => (
            <button
              key={s}
              onClick={() => phase === "idle" && setStyle(s)}
              disabled={phase !== "idle"}
              style={{
                flex: 1, padding: "8px 0",
                background: style === s
                  ? (s === "aggressive" ? "linear-gradient(135deg,#e53e3e,#c53030)" : "linear-gradient(135deg,#2b6cb0,#2c5282)")
                  : "#1a2a4a",
                border: `2px solid ${style === s ? (s === "aggressive" ? "#fc8181" : "#63b3ed") : "#2a4a7a"}`,
                borderRadius: 8, color: "#fff",
                fontFamily: "monospace", fontWeight: "bold",
                fontSize: 13, letterSpacing: 2,
                cursor: phase === "idle" ? "pointer" : "not-allowed",
                textTransform: "uppercase",
                transition: "all 0.2s"
              }}
            >
              {s === "aggressive" ? "⚡ AGGRESSIVE" : "🛡 DEFENSIVE"}
            </button>
          ))}
        </div>

        {/* Style probability hint */}
        <div style={{
          fontSize: 10, color: "#666", marginBottom: 8, textAlign: "center"
        }}>
          {style === "aggressive"
            ? "HIGH RISK • Wicket: 40% | Boundary (4+6): 25%"
            : "LOW RISK  • Wicket: 15% | Boundary (4+6): 10%"}
        </div>

        {/* Power Bar */}
        <div style={{
          background: "#0d1a2e",
          border: "1px solid #2a4a7a",
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 10
        }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: 2, marginBottom: 4 }}>POWER BAR</div>
          <PowerBar
            probs={probs}
            sliderPos={sliderPos}
            onShot={playShot}
            disabled={phase !== "bowling"}
          />
        </div>

        {/* Bowl Button / Game Over */}
        {phase === "gameover" ? (
          <div style={{
            textAlign: "center",
            background: "linear-gradient(135deg, #1a0a0a, #3a0a0a)",
            border: "2px solid #e53e3e",
            borderRadius: 12, padding: 16
          }}>
            <div style={{ fontSize: 22, fontWeight: "bold", color: "#ffd700", marginBottom: 4 }}>
              INNINGS OVER!
            </div>
            <div style={{ fontSize: 28, color: "#fff", marginBottom: 8 }}>
              🏏 {runs} runs — {wickets} wkt{wickets !== 1 ? "s" : ""}
            </div>
            <button onClick={restart} style={{
              background: "linear-gradient(135deg, #38a169, #276749)",
              border: "none", borderRadius: 8, color: "#fff",
              fontFamily: "monospace", fontWeight: "bold",
              fontSize: 16, padding: "10px 32px", cursor: "pointer",
              letterSpacing: 2
            }}>▶ PLAY AGAIN</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={startBowl}
              disabled={phase !== "idle"}
              style={{
                flex: 3, padding: "12px 0",
                background: phase === "idle"
                  ? "linear-gradient(135deg, #38a169, #276749)"
                  : "#1a2a3a",
                border: "2px solid " + (phase === "idle" ? "#68d391" : "#2a4a6a"),
                borderRadius: 8, color: "#fff",
                fontFamily: "monospace", fontWeight: "bold",
                fontSize: 16, letterSpacing: 3,
                cursor: phase === "idle" ? "pointer" : "not-allowed",
              }}
            >
              {phase === "idle" ? "🎳 BOWL" : phase === "bowling" ? "⚡ CLICK POWER BAR!" : "..."}
            </button>
            <button onClick={restart} style={{
              flex: 1, padding: "12px 0",
              background: "#1a0a0a", border: "2px solid #4a2a2a",
              borderRadius: 8, color: "#fc8181",
              fontFamily: "monospace", fontWeight: "bold",
              fontSize: 13, cursor: "pointer", letterSpacing: 1
            }}>↺ RESET</button>
          </div>
        )}

        {/* Ball history */}
        {history.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 2, marginBottom: 4 }}>BALL HISTORY</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: h.outcome === "Wicket" ? "#e53e3e"
                    : h.outcome === "6" ? "#e91e8c"
                    : h.outcome === "4" ? "#d69e2e"
                    : h.outcome === "0" ? "#2d3748"
                    : "#2b6cb0",
                  border: "1px solid #ffffff33",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: "bold", color: "#fff"
                }}>
                  {h.outcome === "Wicket" ? "W" : h.outcome}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}