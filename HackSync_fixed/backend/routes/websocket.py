"""
WebSocket Route — Real-time admin dashboard updates
  GET /ws/admin   — WebSocket connection for admin dashboard
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from helpers.websocket_manager import ws_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for the admin dashboard.
    Broadcasts events:
      - anomaly:new      → when a score anomaly is detected
      - anomaly:resolved → when admin resolves an anomaly flag
      - email:sent       → when an email is successfully delivered
      - email:failed     → when an email fails after all retries
      - judge:scored     → when a judge submits scores for a team
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive — client sends pings
            data = await websocket.receive_text()
            # Echo pings back
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
