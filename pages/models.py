from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base import BaseTenantModel
from typing import Dict, Any, List, Optional


class LandingPage(BaseTenantModel):
    """
    Model for storing landing page information.

    A landing page is composed of multiple content blocks that can be
    configured and arranged via the admin console.
    """

    slug = models.SlugField(unique=True, default="home")
    title = models.CharField(max_length=200)
    meta_description = models.TextField(blank=True, help_text=_("SEO meta description"))
    meta_keywords = models.CharField(
        max_length=255, blank=True, help_text=_("SEO keywords, comma separated")
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("Landing Page")
        verbose_name_plural = _("Landing Pages")
        unique_together = ("client_id", "slug")

    def __str__(self) -> str:
        return f"{self.title} ({self.slug})"


class ContentBlock(BaseTenantModel):
    """
    Model for storing content blocks that make up a landing page.

    Each block represents a distinct section on the landing page with its
    own configuration stored as JSON in the content field.
    """

    # Block type choices
    HERO_CAROUSEL = "HERO_CAROUSEL"
    BANNER_AD_GRID = "BANNER_AD_GRID"
    RECENTLY_VIEWED = "RECENTLY_VIEWED"
    FEATURED_PRODUCTS = "FEATURED_PRODUCTS"
    TEXT_CONTENT = "TEXT_CONTENT"
    NEWSLETTER_SIGNUP = "NEWSLETTER_SIGNUP"

    BLOCK_TYPE_CHOICES = [
        (HERO_CAROUSEL, _("Hero Carousel")),
        (BANNER_AD_GRID, _("Banner Ad Grid")),
        (RECENTLY_VIEWED, _("Recently Viewed Products")),
        (FEATURED_PRODUCTS, _("Featured Products")),
        (TEXT_CONTENT, _("Text Content")),
        (NEWSLETTER_SIGNUP, _("Newsletter Signup")),
    ]

    page = models.ForeignKey(
        LandingPage, related_name="blocks", on_delete=models.CASCADE
    )
    order = models.PositiveIntegerField(default=0, db_index=True)
    block_type = models.CharField(max_length=50, choices=BLOCK_TYPE_CHOICES)
    title = models.CharField(
        max_length=200, blank=True, help_text=_("Internal title for admin reference")
    )

    # All block-specific configuration will be stored here
    content = models.JSONField(
        default=dict, blank=True, help_text=_("JSON configuration for this block")
    )

    # Flag to enable/disable individual blocks without removing them
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["page", "order"]
        verbose_name = _("Content Block")
        verbose_name_plural = _("Content Blocks")
        unique_together = ("client_id", "page", "order")

    def __str__(self) -> str:
        block_type_display = dict(self.BLOCK_TYPE_CHOICES).get(
            self.block_type, self.block_type
        )
        if self.title:
            return f"{self.title} - {block_type_display} (Order: {self.order})"
        return f"{block_type_display} (Order: {self.order})"
