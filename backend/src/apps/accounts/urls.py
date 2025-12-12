# backend/src/apps/accounts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LoginView, UserViewSet, RoleViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
router.register(r"roles", RoleViewSet, basename="roles")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("", include(router.urls)),
]
