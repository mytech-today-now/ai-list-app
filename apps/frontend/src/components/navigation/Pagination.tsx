/**
 * Pagination Component - AI-First semantic pagination with keyboard navigation and MCP integration
 * SemanticType: AIFirstPagination
 * ExtensibleByAI: true
 * AIUseCases: ["Data navigation", "Page switching", "MCP result pagination", "Content browsing"]
 */

import React, { forwardRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  cn,
  getTransition,
  type ComponentSize,
  type AIFirstComponentProps,
} from '../../design-system'

export interface PaginationProps extends 
  React.HTMLAttributes<HTMLNavElement>,
  AIFirstComponentProps {
  /**
   * Current page (1-based)
   */
  currentPage: number
  
  /**
   * Total number of pages
   */
  totalPages: number
  
  /**
   * Number of page buttons to show around current page
   */
  siblingCount?: number
  
  /**
   * Pagination size
   */
  size?: ComponentSize
  
  /**
   * Whether to show first/last buttons
   */
  showFirstLast?: boolean
  
  /**
   * Whether to show previous/next buttons
   */
  showPrevNext?: boolean
  
  /**
   * Whether to show page info
   */
  showPageInfo?: boolean
  
  /**
   * Total number of items (for page info)
   */
  totalItems?: number
  
  /**
   * Items per page (for page info)
   */
  itemsPerPage?: number
  
  /**
   * Custom page info formatter
   */
  formatPageInfo?: (currentPage: number, totalPages: number, totalItems?: number, itemsPerPage?: number) => string
  
  /**
   * Page change handler
   */
  onPageChange?: (page: number) => void
  
  /**
   * Previous page handler
   */
  onPrevious?: () => void
  
  /**
   * Next page handler
   */
  onNext?: () => void
}

/**
 * AI-First Pagination Component
 * 
 * Features:
 * - Smart page number display with ellipsis
 * - Keyboard navigation support
 * - Configurable sibling count for page buttons
 * - Page info display with custom formatting
 * - MCP integration for AI-driven pagination
 * - Accessibility-first with proper ARIA attributes
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(({
  currentPage,
  totalPages,
  siblingCount = 1,
  size = 'md',
  showFirstLast = true,
  showPrevNext = true,
  showPageInfo = false,
  totalItems,
  itemsPerPage,
  formatPageInfo,
  onPageChange,
  onPrevious,
  onNext,
  className,
  semanticMeaning,
  capabilities = ['navigation', 'keyboard-navigation', 'page-switching', 'accessibility'],
  extensibleByAI = true,
  mcpType,
  onMCPCommand,
  aiContext,
  onAIInteraction,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}, ref) => {
  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const range = (start: number, end: number) => {
      const length = end - start + 1
      return Array.from({ length }, (_, idx) => start + idx)
    }
    
    const totalPageNumbers = siblingCount + 5 // 1 + 2*siblingCount + 2 (first/last) + 1 (current)
    
    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages)
    }
    
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)
    
    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2
    
    const firstPageIndex = 1
    const lastPageIndex = totalPages
    
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = range(1, leftItemCount)
      return [...leftRange, 'dots', totalPages]
    }
    
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = range(totalPages - rightItemCount + 1, totalPages)
      return [firstPageIndex, 'dots', ...rightRange]
    }
    
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex)
      return [firstPageIndex, 'dots', ...middleRange, 'dots', lastPageIndex]
    }
    
    return range(1, totalPages)
  }, [currentPage, totalPages, siblingCount])
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return
    
    // MCP command for page change
    if (mcpType && onMCPCommand) {
      onMCPCommand('pagination:change', {
        page,
        previousPage: currentPage,
        totalPages,
        semanticMeaning,
        timestamp: new Date().toISOString(),
      })
    }
    
    // AI interaction for page change
    if (onAIInteraction) {
      onAIInteraction({
        type: 'pagination:change',
        data: {
          page,
          previousPage: currentPage,
          totalPages,
          semanticMeaning,
        },
        context: aiContext,
      })
    }
    
    onPageChange?.(page)
  }
  
  // Handle previous page
  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
      onPrevious?.()
    }
  }
  
  // Handle next page
  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
      onNext?.()
    }
  }
  
  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-sm'
      case 'md':
        return 'px-3 py-2 text-sm'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-2 text-sm'
    }
  }
  
  // Get page info
  const getPageInfo = () => {
    if (formatPageInfo) {
      return formatPageInfo(currentPage, totalPages, totalItems, itemsPerPage)
    }
    
    if (totalItems && itemsPerPage) {
      const startItem = (currentPage - 1) * itemsPerPage + 1
      const endItem = Math.min(currentPage * itemsPerPage, totalItems)
      return `Showing ${startItem}-${endItem} of ${totalItems} items`
    }
    
    return `Page ${currentPage} of ${totalPages}`
  }
  
  // Render page button
  const renderPageButton = (page: number | string, index: number) => {
    if (page === 'dots') {
      return (
        <span
          key={`dots-${index}`}
          className={cn(
            'flex items-center justify-center',
            getSizeClasses(),
            'text-neutral-500'
          )}
          aria-hidden="true"
        >
          <MoreHorizontal className="h-4 w-4" />
        </span>
      )
    }
    
    const pageNumber = page as number
    const isActive = pageNumber === currentPage
    
    return (
      <button
        key={pageNumber}
        type="button"
        onClick={() => handlePageChange(pageNumber)}
        className={cn(
          'flex items-center justify-center font-medium rounded-md transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          getSizeClasses(),
          {
            'bg-primary-600 text-white': isActive,
            'text-neutral-700 hover:bg-neutral-100': !isActive,
          }
        )}
        aria-label={`Go to page ${pageNumber}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {pageNumber}
      </button>
    )
  }
  
  // Generate pagination classes
  const paginationClasses = cn(
    'flex items-center justify-between',
    className
  )
  
  // Generate accessibility attributes
  const accessibilityProps = {
    'aria-label': ariaLabel || semanticMeaning || 'Pagination navigation',
    'data-semantic-type': 'ai-first-pagination',
    'data-mcp-type': mcpType,
    'data-ai-extensible': extensibleByAI,
    'data-testid': testId || 'ai-pagination',
    role: 'navigation',
  }
  
  if (totalPages <= 1) {
    return null
  }
  
  return (
    <nav
      ref={ref}
      className={paginationClasses}
      {...accessibilityProps}
      {...props}
    >
      {/* Page info */}
      {showPageInfo && (
        <div className="text-sm text-neutral-700">
          {getPageInfo()}
        </div>
      )}
      
      {/* Pagination controls */}
      <div className="flex items-center space-x-1">
        {/* First page button */}
        {showFirstLast && currentPage > 1 && (
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            className={cn(
              'flex items-center justify-center font-medium rounded-md transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'text-neutral-700 hover:bg-neutral-100',
              getSizeClasses()
            )}
            aria-label="Go to first page"
          >
            First
          </button>
        )}
        
        {/* Previous button */}
        {showPrevNext && (
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage <= 1}
            className={cn(
              'flex items-center justify-center font-medium rounded-md transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              getSizeClasses(),
              {
                'text-neutral-700 hover:bg-neutral-100': currentPage > 1,
                'text-neutral-400 cursor-not-allowed': currentPage <= 1,
              }
            )}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>
        )}
        
        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => renderPageButton(page, index))}
        </div>
        
        {/* Next button */}
        {showPrevNext && (
          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className={cn(
              'flex items-center justify-center font-medium rounded-md transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              getSizeClasses(),
              {
                'text-neutral-700 hover:bg-neutral-100': currentPage < totalPages,
                'text-neutral-400 cursor-not-allowed': currentPage >= totalPages,
              }
            )}
            aria-label="Go to next page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        )}
        
        {/* Last page button */}
        {showFirstLast && currentPage < totalPages && (
          <button
            type="button"
            onClick={() => handlePageChange(totalPages)}
            className={cn(
              'flex items-center justify-center font-medium rounded-md transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'text-neutral-700 hover:bg-neutral-100',
              getSizeClasses()
            )}
            aria-label="Go to last page"
          >
            Last
          </button>
        )}
      </div>
      
      {/* Hidden capabilities description */}
      {capabilities.length > 0 && (
        <span className="sr-only">
          Pagination capabilities: {capabilities.join(', ')}
        </span>
      )}
    </nav>
  )
})

Pagination.displayName = 'Pagination'

// Pagination variants for common use cases
export const SimplePagination = forwardRef<HTMLElement, Omit<PaginationProps, 'showFirstLast' | 'showPageInfo'>>((props, ref) => (
  <Pagination 
    ref={ref} 
    showFirstLast={false}
    showPageInfo={false}
    semanticMeaning="Simple pagination"
    {...props} 
  />
))

export const DetailedPagination = forwardRef<HTMLElement, Omit<PaginationProps, 'showFirstLast' | 'showPageInfo'>>((props, ref) => (
  <Pagination 
    ref={ref} 
    showFirstLast={true}
    showPageInfo={true}
    semanticMeaning="Detailed pagination with page info"
    {...props} 
  />
))

// MCP-specific pagination variants
export const MCPResultPagination = forwardRef<HTMLElement, Omit<PaginationProps, 'mcpType'>>((props, ref) => (
  <Pagination 
    ref={ref} 
    mcpType="resource"
    semanticMeaning="MCP Result Pagination"
    capabilities={['navigation', 'mcp-results', 'keyboard-navigation']}
    {...props} 
  />
))

SimplePagination.displayName = 'SimplePagination'
DetailedPagination.displayName = 'DetailedPagination'
MCPResultPagination.displayName = 'MCPResultPagination'

export default Pagination
