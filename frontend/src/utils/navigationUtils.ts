export const getBackPath = (pathname: string): string | null => {
  // create-course -> point back to courses
  if (pathname === '/create-course') {
    return '/courses';
  }

  // courses/{id} -> point back to courses
  // Regex to match /courses/{id} but not sub-routes like /courses/{id}/materials
  if (/^\/courses\/[a-zA-Z0-9]+$/.test(pathname)) {
    return '/courses';
  }

  // courses/{id}/materials -> point back to courses/{id} NOT courses
  // Wait, user request says: http://localhost:5173/courses/{id}/materials -> point back (implied to previous page which is usually course detail)
  // Let's assume point back to course detail page /courses/{id}
  const materialsMatch = pathname.match(/^\/courses\/([a-zA-Z0-9]+)\/materials$/);
  if (materialsMatch) {
    return `/courses/${materialsMatch[1]}`;
  }

  // assignments/{id} -> point back to assignments (if it's the detail page)
  // Assuming list is at /assignments
  // Route /assignments/:id
  if (/^\/assignments\/[a-zA-Z0-9]+$/.test(pathname)) {
    return '/assignments';
  }

  // create-assignment -> point back to assignments
  if (pathname === '/create-assignment') {
    return '/assignments';
  }

  // assignments/{id}/submissions -> remove the back button already in the right and add it in the left
  // Point back to assignment detail? or assignments list?
  // User says: "http://localhost:5173/assignments/{id}/submissions -> remove the back button already in the right and add it in the left"
  // Usually logical parent is the assignment detail page. Let's point to /assignments/{id}
  const submissionsMatch = pathname.match(/^\/assignments\/([a-zA-Z0-9]+)\/submissions$/);
  if (submissionsMatch) {
    return `/assignments/${submissionsMatch[1]}`;
  }

  // courses/edit/{id} -> point back to http://localhost:5173/courses/{id}
  const editCourseMatch = pathname.match(/^\/courses\/edit\/([a-zA-Z0-9]+)$/);
  if (editCourseMatch) {
    return `/courses/${editCourseMatch[1]}`;
  }
  
  // courses/{id}/add-module needs a back button too? User didn't specify but likely yes.
  // /courses/{id}/modules matches the pattern /courses/{id}/... which might need handling if we want it universal.
  // For now, adhering strictly to the user list + logical extensions.
  
  return null;
};
