from fastapi import Header

from app.core.exceptions import UnauthorizedError

# TODO: заменить на реальную проверку JWT, когда Auth Service отдаст контракт
# (алгоритм, secret/public key, формат claims).
# Сейчас — временная заглушка: ожидаем user_id в заголовке X-User-Id,
# чтобы можно было разрабатывать и тестировать Site Service независимо.


async def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    if not x_user_id:
        raise UnauthorizedError("Не передан X-User-Id (заглушка вместо JWT)")
    return x_user_id
