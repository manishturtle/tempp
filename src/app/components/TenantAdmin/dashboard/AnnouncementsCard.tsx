import { Box, Typography, Button, useTheme } from '@mui/material';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import NewReleasesIcon from '@mui/icons-material/NewReleases';

type Announcement = {
  id: number;
  title: string;
  description: string;
  date: string;
  isImportant?: boolean;
};

export const AnnouncementsCard = () => {
  const theme = useTheme();

  const announcements: Announcement[] = [
    {
      id: 1,
      title: 'Upcoming Maintenance',
      description:
        'Scheduled maintenance on June 25th from 2:00 AM to 4:00 AM UTC. Some services may be temporarily unavailable.',
      isImportant: true,
      date: '',
    },
    {
      id: 2,
      title: 'New Feature: Advanced Analytics Dashboard',
      description:
        "We're excited to announce our new Advanced Analytics Dashboard will be available starting next week.",
      date: 'Posted on June 10, 2025',
    },
    {
      id: 3,
      title: 'API Version 2.5 Released',
      description:
        'The latest API version (2.5) includes improved performance and new endpoints for user management.',
      date: 'Posted on June 02, 2025',
    },
  ];

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        p: 3,
        borderRadius: 2,
        boxShadow: 1,
        height: '100%',
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={3}>
        Platform Announcements
      </Typography>

      <Box>
        {announcements.map((announcement, index) => (
          <Box key={announcement.id} mb={index < announcements.length - 1 ? 3 : 0}>
            {announcement.isImportant ? (
              <Box
                sx={{
                  bgcolor: theme.palette.info.light,
                  p: 2,
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Box display="flex" alignItems="flex-start">
                  <AnnouncementIcon
                    sx={{ color: "white", mr: 1, mt: 0.5 }}
                    fontSize="small"
                  />
                  <Box>
                    <Typography variant="subtitle2" color="white" fontWeight={600}>
                      {announcement.title}
                    </Typography>
                    <Typography variant="body2" color="white" mt={0.5}>
                      {announcement.description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box>
                <Box display="flex" alignItems="flex-start" mb={0.5}>
                  <NewReleasesIcon
                    sx={{
                      color: theme.palette.primary.main,
                      fontSize: '1rem',
                      mr: 1,
                      mt: 0.25,
                    }}
                  />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {announcement.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  {announcement.description}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {announcement.date}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Button
        fullWidth
        variant="outlined"
        size="small"
        sx={{ mt: 3, color: theme.palette.text.secondary }}
      >
        View All Announcements
      </Button>
    </Box>
  );
};
