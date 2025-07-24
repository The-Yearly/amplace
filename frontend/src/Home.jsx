import { useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
const Home = () => {
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [info, setInfo] = useState("Clicked Box: (x, y)");
  const [highlightedPixel, setHighlightedPixel] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const overlayPositionRef = useRef({ top: 0, left: 0 });
  const backendUrl = import.meta.env.VITE_BACKEND;
  const cols = 150;
  const rows = 80;
  const boxSize = 10;
  const [pixel_db, setPixelDB] = useState([]);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [currentUser, setCurrentUser] = useState("");
  const sendData = async () => {
    if (!highlightedPixel) {
      toast.warn("Please click a pixel first!");
      return;
    }
    if (!currentUser.trim()) {
      toast.warn("Please enter your name!");
      return;
    }
    try {
      const res = await axios.post(`${backendUrl}/api/update_pixel`, {
        user: currentUser,
        pixel_list: [
          {
            X: highlightedPixel.x,
            Y: highlightedPixel.y,
            "hex-code": selectedColor,
          },
        ],
      });
      if (res.status == 200) {
        if (res.data.message.includes("try again")) {
          toast(res.data.message);
        } else {
          toast("Pixel updated successfully!");
        }
        fetchPixelData();
      } else {
        toast.error("Update failed!");
      }
    } catch (err) {
      console.error("Error updating pixel:", err);
      toast.error("Error updating pixel!");
    }
  };
  const fetchPixelData = async () => {
    try {
      const response = await fetch(backendUrl + "/api/get_pixel");
      const data = await response.json();
      if (data.success) {
        const updatedPixels = data.pixels.map((pixel) => ({
          x: pixel.X,
          y: pixel.Y,
          hex: pixel["hex-code"],
          user: pixel.user,
          updatedAt: pixel.updated_at,
        }));
        setPixelDB(updatedPixels);
      }
    } catch (error) {
      console.error("Error fetching pixel data:", error);
    }
  };

  const fetchLeaderboardData = async () => {
    try {
      const response = await fetch(backendUrl + "/api/get_user_details");
      const data = await response.json();
      if (data.success) {
        const sortedLeaderboard = data.user_data.sort(
          (a, b) => b.score - a.score,
        );
        setLeaderboardData(sortedLeaderboard);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    }
  };

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (mainCanvas && overlayCanvas) {
      const mainCtx = mainCanvas.getContext("2d");
      const overlayCtx = overlayCanvas.getContext("2d");

      const drawGrid = (ctx) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const pixel = pixel_db.find((p) => p.x === x && p.y === y);
            const fillColor = pixel ? pixel.hex : "#ffffff";
            ctx.fillStyle = fillColor;
            ctx.fillRect(x * boxSize, y * boxSize, boxSize, boxSize);
          }
        }

        if (highlightedPixel) {
          const { x, y } = highlightedPixel;
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.strokeRect(x * boxSize, y * boxSize, boxSize, boxSize);
        }
      };

      drawGrid(overlayCtx);

      let isDragging = false;
      let startX, startY;

      const handleMouseDown = (event) => {
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
      };

      const handleMouseMove = (event) => {
        if (isDragging) {
          const dx = event.clientX - startX;
          const dy = event.clientY - startY;

          overlayCanvas.style.top = `${overlayPositionRef.current.top + dy}px`;
          overlayCanvas.style.left = `${overlayPositionRef.current.left + dx}px`;
        }
      };

      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          const newTop = parseFloat(overlayCanvas.style.top) || 0;
          const newLeft = parseFloat(overlayCanvas.style.left) || 0;
          overlayPositionRef.current = { top: newTop, left: newLeft };
        }
      };

      const handleMouseLeave = () => {
        isDragging = false;
      };

      const handleClick = (event) => {
        const rect = overlayCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / boxSize);
        const y = Math.floor((event.clientY - rect.top) / boxSize);

        const clickedPixel = pixel_db.find((p) => p.x === x && p.y === y);
        if (clickedPixel) {
          setInfo(
            `Clicked Box: (${clickedPixel.x}, ${clickedPixel.y}), Color: ${clickedPixel.hex}, User: ${clickedPixel.user}`,
          );
          setHighlightedPixel({ x: clickedPixel.x, y: clickedPixel.y });
        } else {
          setInfo(`Clicked Box: (${x}, ${y})`);
          setHighlightedPixel({ x: x, y: y });
        }

        drawGrid(overlayCtx);
      };

      overlayCanvas.addEventListener("mousedown", handleMouseDown);
      overlayCanvas.addEventListener("mousemove", handleMouseMove);
      overlayCanvas.addEventListener("mouseup", handleMouseUp);
      overlayCanvas.addEventListener("mouseleave", handleMouseLeave);
      overlayCanvas.addEventListener("click", handleClick);

      return () => {
        overlayCanvas.removeEventListener("mousedown", handleMouseDown);
        overlayCanvas.removeEventListener("mousemove", handleMouseMove);
        overlayCanvas.removeEventListener("mouseup", handleMouseUp);
        overlayCanvas.removeEventListener("mouseleave", handleMouseLeave);
        overlayCanvas.removeEventListener("click", handleClick);
      };
    }
  }, [pixel_db, highlightedPixel]);

  useEffect(() => {
    fetchPixelData();
    fetchLeaderboardData();
    const interval = setInterval(() => {
      fetchPixelData();
      fetchLeaderboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", width: "1200px", height: "600px" }}>
      <canvas
        ref={mainCanvasRef}
        width={1500}
        height={800}
        style={{ position: "absolute" }}
      />
      <canvas
        ref={overlayCanvasRef}
        width={1500}
        height={800}
        style={{
          border: "1px solid black",
          position: "absolute",
          top: `${overlayPositionRef.current.top}px`,
          left: `${overlayPositionRef.current.left}px`,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "1vh",
          left: "1vh",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "1vh",
          fontSize: "2vh",
          borderRadius: "0.5vw",
          zIndex: 1000,
          width: "18vw",
          height: "10vh",
          maxWidth: "850px",
          minWidth: "20px",
          boxSizing: "border-box",
        }}
      >
        {info}
      </div>
      <div
        style={{
          position: "fixed",
          top: "1vh",
          left: "1vh",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "1vh",
          fontSize: "2vh",
          borderRadius: "0.2vw",
          zIndex: 1000,
          cursor: "pointer",
          width: "18vw",
        }}
        onClick={() => setShowLeaderboard(!showLeaderboard)}
      >
        Leaderboard {showLeaderboard ? "▲" : "▼"}
      </div>
      {showLeaderboard && (
        <div
          style={{
            position: "fixed",
            top: "6vh",
            left: "1vh",
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "1vh",
            fontSize: "2vh",
            borderRadius: "0.2vw",
            zIndex: 1000,
            maxHeight: "200px",
            overflowY: "auto",
            width: "18vw",
          }}
        >
          <ul style={{ listStyleType: "none", padding: "0" }}>
            {leaderboardData.map(({ user, score }) => (
              <li key={user} style={{ margin: "0.5vh 0" }}>
                {user}: {score} pixels
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* GitHub Link */}
      <div
        style={{
          position: "fixed",
          top: "1vh",
          right: "1vh",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "1vh",
          fontSize: "2vh",
          borderRadius: "0.2vw",
          zIndex: 1000,
          cursor: "pointer",
          width: "20vw",
          display: "flex",
          alignItems: "center",
        }}
      >
        <a
          href="https://github.com/JATAYU000/amPlace_test"
          style={{
            color: "white",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          <img
            src="/github.png"
            alt="GitHub Logo"
            style={{ width: "1.8vw", height: "3vh", marginRight: "1vh" }}
          />
          Contribution Repo
        </a>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: "1vh",
          right: "1vh",
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "2vh 2vw",
          fontSize: "1.8vh",
          borderRadius: "0.6vh",
          zIndex: 1000,
          width: "22vw",
          minWidth: "200px",
          maxWidth: "300px",
          display: "flex",
          flexDirection: "column",
          gap: "1vh",
          boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
        }}
      >
        <label
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Pick Color:
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            style={{
              marginLeft: "1vh",
              width: "40px",
              height: "30px",
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          />
        </label>
        <ToastContainer />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5vh",
          }}
        >
          <label>Your Name:</label>
          <input
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            placeholder="Enter your name"
            style={{
              padding: "0.6vh 1vh",
              borderRadius: "0.4vh",
              border: "1px solid #ccc",
              fontSize: "1.6vh",
              outline: "none",
              color: "black",
            }}
          />
        </div>

        <button
          onClick={sendData}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "1vh 1vw",
            border: "none",
            borderRadius: "0.5vh",
            fontSize: "1.8vh",
            cursor: "pointer",
            marginTop: "1vh",
          }}
        >
          Submit Pixel
        </button>
      </div>
    </div>
  );
};

export default Home;
