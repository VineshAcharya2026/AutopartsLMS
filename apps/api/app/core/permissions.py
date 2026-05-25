from enum import Enum
from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, status
from prisma.enums import Role
from prisma.models import User

from app.core.deps import get_current_user


class Permission(str, Enum):
    MANAGE_ADMINS = "manage_admins"
    MANAGE_AGENTS = "manage_agents"
    MANAGE_CENTERS = "manage_centers"
    MANAGE_INTEGRATIONS = "manage_integrations"
    MANAGE_ROUTING = "manage_routing"
    VIEW_ALL_LEADS = "view_all_leads"
    VIEW_CENTER_LEADS = "view_center_leads"
    VIEW_ASSIGNED_LEADS = "view_assigned_leads"
    ASSIGN_LEADS = "assign_leads"
    DELETE_LEADS = "delete_leads"
    RESTORE_TRASH = "restore_trash"
    PURGE_TRASH = "purge_trash"
    VIEW_AUDIT = "view_audit"
    SEND_COMMS = "send_comms"
    IMPORT_CSV = "import_csv"
    VIEW_ANALYTICS = "view_analytics"


ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.MASTER_ADMIN: set(Permission),
    Role.ADMIN: {
        Permission.MANAGE_AGENTS,
        Permission.VIEW_CENTER_LEADS,
        Permission.ASSIGN_LEADS,
        Permission.DELETE_LEADS,
        Permission.SEND_COMMS,
        Permission.IMPORT_CSV,
        Permission.VIEW_ANALYTICS,
    },
    Role.AGENT: {
        Permission.VIEW_ASSIGNED_LEADS,
        Permission.SEND_COMMS,
    },
}


def user_permissions(user: User) -> set[Permission]:
    base = ROLE_PERMISSIONS.get(user.role, set())
    extra = user.permissions or {}
    if isinstance(extra, dict):
        for key, enabled in extra.items():
            if enabled:
                try:
                    base.add(Permission(key))
                except ValueError:
                    pass
    return base


def has_permission(user: User, permission: Permission) -> bool:
    return permission in user_permissions(user)


def require_roles(*roles: Role):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency


def require_permission(permission: Permission):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency
