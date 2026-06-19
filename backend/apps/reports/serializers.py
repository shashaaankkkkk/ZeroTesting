"""
Report serializers.
"""
from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    """Report serializer."""
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id", "name", "report_type", "format", "file_path",
            "filters", "total_runs", "pass_rate",
            "download_url", "created_at",
        ]

    def get_download_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f"/api/v1/reports/{obj.id}/download/")
        return None


class GenerateReportSerializer(serializers.Serializer):
    """Generate report request."""
    report_type = serializers.ChoiceField(choices=["summary", "detailed"])
    format = serializers.ChoiceField(choices=["pdf", "csv"])
    filters = serializers.DictField(required=False, default=dict)
