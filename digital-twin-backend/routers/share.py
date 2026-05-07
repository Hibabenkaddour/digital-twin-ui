import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from db.database import get_db, ShareLinkDB
from db import crud
from models.schemas import ShareLinkCreate, ShareLinkUpdate, ShareLinkResponse, ShareLinkVerify
from routers.auth import get_current_user

router = APIRouter(prefix="/share", tags=["Share"])


# ─── Password helpers ─────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))


# ─── Authenticated endpoints (owner operations) ───────────────────────────────

@router.post("", response_model=ShareLinkResponse)
def create_share_link(
    link: ShareLinkCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Create a password-protected share link for a twin you own."""
    # Verify that the twin belongs to this user before sharing it
    twin = crud.get_layout(db, link.twin_id, user_id=user_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found or not owned by you")

    link_id = str(uuid.uuid4())
    db_link = ShareLinkDB(
        id=link_id,
        user_id=user_id,
        twin_id=link.twin_id,
        name=link.name,
        password_hash=_hash_password(link.password),
    )
    db.add(db_link)
    db.commit()
    db.refresh(db_link)

    return ShareLinkResponse(
        id=db_link.id,
        twin_id=db_link.twin_id,
        name=db_link.name,
        created_at=db_link.created_at,
    )


@router.get("", response_model=list[ShareLinkResponse])
def list_share_links(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """List only the share links created by the authenticated user."""
    links = db.query(ShareLinkDB).filter(ShareLinkDB.user_id == user_id).all()
    return [
        ShareLinkResponse(
            id=lnk.id,
            twin_id=lnk.twin_id,
            name=lnk.name,
            created_at=lnk.created_at,
        )
        for lnk in links
    ]


@router.put("/{share_id}", response_model=ShareLinkResponse)
def update_share_link(
    share_id: str,
    update_data: ShareLinkUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Update a share link — only if you own it."""
    db_link = (
        db.query(ShareLinkDB)
        .filter(ShareLinkDB.id == share_id, ShareLinkDB.user_id == user_id)
        .first()
    )
    if not db_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if update_data.name is not None:
        db_link.name = update_data.name
    if update_data.password is not None and update_data.password.strip():
        db_link.password_hash = _hash_password(update_data.password)

    db.commit()
    db.refresh(db_link)

    return ShareLinkResponse(
        id=db_link.id,
        twin_id=db_link.twin_id,
        name=db_link.name,
        created_at=db_link.created_at,
    )


@router.delete("/{share_id}")
def delete_share_link(
    share_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Delete a share link — only if you own it."""
    db_link = (
        db.query(ShareLinkDB)
        .filter(ShareLinkDB.id == share_id, ShareLinkDB.user_id == user_id)
        .first()
    )
    if not db_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    db.delete(db_link)
    db.commit()
    return {"deleted": share_id}


# ─── PUBLIC endpoint — no auth required ───────────────────────────────────────

@router.post("/{share_id}/verify")
def verify_share_link(
    share_id: str,
    verify_data: ShareLinkVerify,
    db: Session = Depends(get_db),
    # NOTE: intentionally NO get_current_user here — this is the public share viewer
):
    """
    Verify the password for a share link and return the full twin snapshot.
    This endpoint is intentionally public so that external recipients can view
    the shared twin without having a Keycloak account.
    The twin data is embedded in the response so the viewer never calls
    the authenticated /twins/{id} endpoint.
    """
    db_link = db.query(ShareLinkDB).filter(ShareLinkDB.id == share_id).first()
    if not db_link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if not _verify_password(verify_data.password, db_link.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    # Fetch the twin WITHOUT user_id filter — the share link IS the authorization
    db_layout = crud.get_layout(db, db_link.twin_id, user_id=None)
    if not db_layout:
        raise HTTPException(status_code=404, detail="Twin no longer exists")

    twin_schema = crud.layout_db_to_schema(db_layout)
    return {
        "success": True,
        "twin_id": db_link.twin_id,
        "twin_data": twin_schema.model_dump(mode="json"),
    }
