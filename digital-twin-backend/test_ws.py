import asyncio
import websockets

async def test():
    print("Connecting...")
    async with websockets.connect('ws://127.0.0.1:8000/ws/kpis?domain=warehouse', additional_headers={'Origin': 'http://localhost:5173'}) as ws:
        print('Connected!')
        msg = await ws.recv()
        print('Message:', msg)

asyncio.run(test())
